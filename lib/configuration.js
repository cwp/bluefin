import {Destruction, Grant, Migration, Program, Revocation, Role, Table} from './program'

import Client from './client'
import Database from './database'
import Path from './path'
import Plan from './plan'
import TOML from '@iarna/toml'
import merge from 'deepmerge'
import nodeFs from 'fs'
import path from 'path'

export default class Configuration {
  static read(pathToFile, fs) {
    const vfs = fs || nodeFs
    return new Promise((resolve, reject) => {
      vfs.readFile(pathToFile, (err, data) => {
        if (err) return reject(err)
        const directory = path.dirname(pathToFile)
        const file = path.basename(pathToFile)
        const raw = TOML.parse(data)
        resolve(new Configuration(directory, file, raw, vfs))
      })
    })
  }

  static async db(name, pathToFile, fs) {
    const full = await this.read(pathToFile, fs)
    return full.focus(name)
  }

  constructor(directory, file, raw, fs) {
    this.directory = directory
    this.file = file
    this.raw = raw
    this.fs = fs || nodeFs
  }

  renderDbConfig(nick) {
    const leaf = this.raw[nick]

    let names = leaf.inherit || []
    if (!Array.isArray(names)) names = [names]

    const stem = names.map(name => this.raw[name])
    stem.push(leaf)
    return merge.all(stem)
  }

  focus(nick) {
    if (!(nick in this.raw)) throw new Error(`Unknown database ${nick}`)
    const raw = this.renderDbConfig(nick)
    return new DatabaseConfiguration(nick, this.directory, this.file, raw, this.fs)
  }
}

class DatabaseConfiguration {
  constructor(nick, directory, file, raw, fs) {
    this.nick = nick
    this.directory = directory
    this.file = file
    this.raw = raw
    this.fs = fs
  }

  get name() {
    return this.raw.database || this.nick
  }

  env(options) {
    if (!('env' in this.raw)) return {}
    return Object.assign({}, this.raw.env)
  }

  validate() {
    // this should check presence and types of options
  }

  connect(dbName = this.name) {
    return Client.connect(this.dsn(dbName))
  }

  database(options) {
    return new Database(this)
  }

  dsn(dbName = this.name) {
    const dsn = {database: dbName, application_name: 'bluefin'}
    if (this.raw.host) dsn.host = this.raw.host
    if (this.raw.port) dsn.port = this.raw.port
    if (this.raw.user) dsn.user = this.raw.user
    if (this.raw.ssl) dsn.ssl = this.raw.ssl
    return dsn
  }

  async plan(options = {}) {
    const destroy = await this.destroyPhase(options)
    const migrate = await this.migrationPhase(options)
    const grant = await this.grantPhase(options)

    const programs = destroy.concat(migrate, grant)
    const partials = await this.loadPartials()
    const env = this.createEnvironment()
    return new Plan(programs, partials, env)
  }

  async loadMiddleware() {
    const modules = []

    if ('middleware' in this.raw) {
      for (let name of this.raw.middleware) {
        const module = await import(`./middleware/${name}`)
        modules.push(module.default)
      }
    }

    return modules
  }

  async loadPartials() {
    const partials = {}

    if (this.raw.partials) {
      const directory = new Path(this.fs, this.directory, this.raw.partials)
      const files = await directory.readdir()

      const raw = this.raw.partials || {}
      const vows = files.map(async file => {
        const name = file.basename
        partials[name] = await file.read()
      })
      await Promise.all(vows)
    }

    return partials
  }

  createEnvironment() {
    const env = merge(defaultEnv, this.raw.env || {}, {database: this.name})
    return env
  }

  async template(relative, Class = Program, env) {
    const file = new Path(this.fs, this.directory, relative)
    return Class.fromFile(file, env)
  }

  stdTemplates(name, Class = Program, env) {
    if ('templates' in this.raw && name in this.raw.templates) {
      const raw = this.raw.templates[name]
      const relPaths = Array.isArray(raw) ? raw : [raw]
      var vows = relPaths.map(p => this.template(p, Class, env))
    } else {
      var vows = [Class.default(name, env)]
    }

    return Promise.all(vows)
  }

  userTemplates(kind, name, Class = Program) {
    if (!(kind in this.raw)) return []
    const raw = this.raw[kind][name]
    const relPaths = Array.isArray(raw) ? raw : [raw]
    const vows = relPaths.map(p => this.template(p, Class, {role: name}))
    return Promise.all(vows)
  }

  destroyPhase(options) {
    return options.rebuild ? this.stdTemplates('destroy', Destruction) : []
  }

  async migrationPhase(options) {
    const tablesVow = this.stdTemplates('create-table', Table, {table: 'migrations'})

    const directory = new Path(this.fs, this.directory, this.raw.migrations)
    const files = await directory.readdir()
    const migrationVows = []
    let prologueVow
    let epilogueVow
    for (let ea of files) {
      if (ea.basename === 'prologue.sql') {
        prologueVow = Program.fromFile(ea)
      } else if (ea.basename === 'epilogue.sql') {
        epilogueVow = Program.fromFile(ea)
      } else if (/^\d+-[^\.]+.sql/.test(ea.basename)) {
        migrationVows.push(Migration.fromFile(ea))
      }
    }

    let migrations = await Promise.all(migrationVows)

    if (options.first !== undefined) {
      migrations = migrations.filter(m => m.ordinal >= options.first)
    }

    if (options.last !== undefined) {
      migrations = migrations.filter(m => m.ordinal <= options.last)
    }

    if (migrations.length) {
      migrations.sort((a, b) => a.ordinal - b.ordinal)
      const ordinal = migrations[0].ordinal
      const lim = migrations.length
      for (let i = 0; i < lim; i++) {
        const expected = ordinal + i
        if (migrations[i].ordinal < expected) {
          throw new Error(`Duplicate migration number ${migrations[i].ordinal}`)
        }
        if (migrations[i].ordinal > expected) {
          throw new Error(`Missing migration number ${migrations[i].ordinal}`)
        }
      }
    }

    const prologue = await prologueVow
    if (prologue) migrations.unshift(prologue)

    const epilogue = await epilogueVow
    if (epilogue) migrations.push(epilogue)

    const tables = await tablesVow
    return tables.concat(migrations)
  }

  async grantPhase(options) {
    const programs = []
    if (!options.grants) return []
    if (!options.rebuild) {
      const templates = await this.stdTemplates('revoke', Revocation)
      programs.push(...templates)
    }

    const createRoleNames = []
    if ('roles' in this.raw) createRoleNames.push(...Object.keys(this.raw.roles))

    const grantRoleNames = []
    if ('grants' in this.raw) grantRoleNames.push(...Object.keys(this.raw.grants))

    const namesToCreate = new Set()
    for (const name of createRoleNames) namesToCreate.add(name)
    for (const name of grantRoleNames) namesToCreate.add(name)
    for (const name of namesToCreate) {
      const roles = await this.userTemplates('roles', name, Role)
      programs.push(...roles)
    }

    for (const name of grantRoleNames) {
      const grants = await this.userTemplates('grants', name, Grant)
      programs.push(...grants)
    }

    return programs
  }

  inspect() {
    return `<DatabaseConfiguration ${this.directory}/${this.file}>`
  }
}

const defaultEnv = {
  has: {
    roles: false,
    schemas: false,
    foreignDataWrappers: false,
    foreignServers: false,
    types: false,
    domains: false,
  },
  roleNames: '{{roleNames}}',
  schemaNames: '{{schemaNames}}',
  foreignDataWrapperNames: '{{foreignDataWrapperNames}}',
  foreignServerNames: '{{foreignServerNames}}',
  typeNames: '{{typeNames}}',
  domainNames: '{{domainNames}}',
}

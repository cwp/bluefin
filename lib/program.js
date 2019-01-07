import Path from './path'
import mustache from 'mustache'
import nodeFs from 'fs'

const fileRegEx = /^(\d+)-([-\w]+).sql/
mustache.escape = text => text

export class Program {
  static default(name, env) {
    const pathToFile = new Path(nodeFs, __dirname, `templates/${name}.sql`)
    return this.fromFile(pathToFile, env)
  }
  static async fromFile(pathToFile, env) {
    const sql = (await pathToFile.read()).trim()
    return new this(sql, pathToFile, env)
  }

  constructor(tmpl, source, env = {}) {
    this.tmpl = tmpl
    this.source = source
    this.env = env
    this.skip = false
  }

  get path() {
    if (this.source) return this.source.relative
  }

  get description() {
    return this.path || '(generated sql)'
  }

  async customize(options, database) {}

  get json() {
    const chunk = {skip: this.skip, env: this.env}
    chunk.tmpl = this.tmpl.replace(/\s+/g, ' ')
    if (this.source) chunk.path = this.source.relative
    return chunk
  }

  sql(outer, partials) {
    const env = Object.assign({}, outer, this.env)
    let sql = mustache.render(this.tmpl, env, partials)
    sql = sql.trim()
    if (sql === '') return null

    if (sql.slice(-1) !== ';') sql += ';'
    sql += '\n'
    return sql
  }
}

export class Destruction extends Program {
  description = 'destroy existing database'
}

export class Grant extends Program {
  get description() {
    return `grant ${this.env.role} ${this.path}`
  }
}

export class Migration extends Program {
  constructor(tmpl, source, env) {
    super(tmpl, source, env)
    const filename = this.source.basename
    const match = fileRegEx.exec(filename)
    if (match === null) {
      throw new Error(`Malformed filename '${filename}'`)
    }
    this.ordinal = parseInt(match[1])
    this.name = match[2]
  }

  get description() {
    return `apply migration ${this.ordinal} - ${this.name}`
  }

  sql(outer, partials) {
    let sql = super.sql(outer, partials)
    if (sql === null) sql = this.bookkeeping()
    else sql += this.bookkeeping()
    return sql
  }

  bookkeeping() {
    return `insert into bluefin.migrations(ordinal, name) values (${this.ordinal}, '${this.name}');\n`;
  }

  async customize(options, database) {
      // if we're rebuilding, it doesn't matter what migrations have already been applied
      if (options.rebuild) {
        this.skip = false
        return
      }

    const maxOrdinal = await database.maxMigrationOrdinal()
    this.skip = this.ordinal <= maxOrdinal
  }
}

export class Revocation extends Program {
  description = 'revoke existing privileges'
}

export class Role extends Program {
  get description() {
    return `create role ${this.env.role}`
  }

  async customize(options, database) {
    const roles = await database.roles()
    this.skip = roles.includes(this.env.role)
  }
}

export class Table extends Program {
  get description() {
    return `create table bluefin.${this.env.table}`
  }

  async customize(options, database) {
    // the migrations table will be removed in a rebuild, so don't skip
    if (options.rebuild) {
      this.skip = false
      return
    }

    // since we're not rebuilding, only create if it's not already there
    const tables = await database.tables()
    this.skip = tables.includes(this.env.table)
  }
}

export default null

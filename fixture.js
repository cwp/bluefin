import Configuration from './lib/configuration'
import Database from './lib/database'
import {migrate} from './lib/commands'
import {promisify} from 'util'
import {randomBytes} from 'crypto'

const randbytes = promisify(randomBytes)

export async function create(endpoint, confFilePath, nickname, fs) {
  const [conf, dbName] = await Promise.all([
    await Configuration.db(nickname, confFilePath, fs),
    genName(nickname),
  ])

  Object.assign(conf.raw, endpoint)
  const sysdb = await createDatabase(conf, dbName)
  conf.raw.database = dbName

  try {
    await build(conf)
    return fixture(conf, sysdb)
  } catch (e) {
    try {
      await destroyDatabase(conf, sysdb)
    } catch (destroyError) {
      console.log(destroyError)
    } finally {
      throw e
    }
  }
}

export async function rebuild(confFilePath, nickname, fs) {
  const options = {rebuild: true, quiet: true, grants: true}
  const conf = await migrate(nickname, confFilePath, options)
  const dsn = conf.dsn()
  delete dsn.application_name
  return dsn
}

const genName = async base => {
  const buf = await randbytes(4)
  const val = buf.readUInt32BE(0)
  return `fixture_${base}_${val.toString(36)}`
}

const createDatabase = async (conf, dbName) => {
  try {
    var sysClient = await conf.connect()
    await sysClient.exec(`create database ${dbName}`)
    var sysdb = await sysClient.value('select current_database()')
  } finally {
    if (sysClient) await sysClient.disconnect()
  }
  return sysdb
}

const build = async conf => {
  try {
    const options = {rebuild: false, migrations: true, grants: true}

    const oracle = Database.stub()
    const middleware = await conf.loadMiddleware()
    const plan = await conf.plan(options)
    await plan.initialize(options, middleware)
    await plan.customize(options, oracle, middleware)
    await plan.finalize(options, middleware)

    var client = await conf.connect()
    await plan.execute(client)
    if ('grants' in conf.raw) {
      const roles = Object.keys(conf.raw.grants).join(', ')
      await client.exec(`grant connect on database ${conf.name} to ${roles}`)
    }
  } catch (e) {
    console.error(e)
  } finally {
    if (client) await client.disconnect()
  }
}

const destroyDatabase = async (conf, sysdb) => {
  try {
    var client = await conf.connect(sysdb)
    await client.exec(`drop database if exists ${conf.name}`)
  } finally {
    if (client) await client.disconnect()
  }
}

const fixture = (conf, sysdb) => {
  const endpoint = conf.dsn()
  delete endpoint.application_name
  return {
    endpoint,
    destroy: () => destroyDatabase(conf, sysdb),
  }
}

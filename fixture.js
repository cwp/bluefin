import Configuration from './lib/configuration'
import Database from './lib/database'
import Plan from './lib/plan'
import {promisify} from 'util'
import {randomBytes} from 'crypto'

const randbytes = promisify(randomBytes)
export async function create(endpoint, confFilePath, nickname, fs) {
  const [conf, dbName] = await Promise.all([
    await Configuration.db(nickname, confFilePath, fs),
    genName(nickname),
  ])

  Object.assign(conf.raw, endpoint)
  await createDatabase(conf, dbName)
  conf.raw.database = dbName

  try {
    await build(conf)
    return fixture(conf, endpoint.database)
  } catch (e) {
    try {
      await destroyDatabase(conf, endpoint.database)
    } catch (destroyError) {
      console.log(destroyError)
    } finally {
      throw e
    }
  }
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
  } finally {
    if (sysClient) await sysClient.disconnect()
  }
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

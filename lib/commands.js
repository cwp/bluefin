import Configuration from './configuration'
import fs from 'fs'

export async function migrate(dbName, fpath, options) {
  const conf = await Configuration.db(dbName, fpath, fs)
  const middleware = await conf.loadMiddleware()
  const plan = await conf.plan(options)

  await plan.initialize(options, middleware)
  if (!options.abstract) {
    let database
    try {
      database = conf.database(options)
      await plan.customize(options, database, middleware)
    } finally {
      if (database) await database.disconnect()
    }
  }
  await plan.finalize(options, middleware)

  if (options.sql) {
    console.log(plan.sql)
  } else if (options.json) {
    console.log(plan.json)
  } else if (!options.quiet) {
    console.log(plan.description)
  }
  if (!options.noop) {
    let client
    try {
      client = await conf.connect()
      await plan.execute(client)
    } catch (e) {
      await plan.reportError(e)
    } finally {
      if (client) await client.disconnect()
    }
  }
}

export default null

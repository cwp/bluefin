import fs from 'fs'

import Configuration from './configuration'

export async function run(fn, ...args) {
  try {
    return fn(...args)
  } catch (e) {
    if ('DEBUG' in process.env) {
      console.log(e)
    } else if (e.expose) {
      console.log(e.message)
      console.log(e.description)
    } else {
      console.log('An internal error occured')
      console.log(`Unexpected error: ${e.message}`)
    }
  }
}

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

  return conf
}

export default null

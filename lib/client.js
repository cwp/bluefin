import log from './log'
import pg from 'pg'

export default class Client {
  static async connect(dsn) {
    const inst = new this(dsn)
    await inst.connect()
    return inst
  }

  constructor(dsn) {
    this.dsn = dsn
    this.pgClient = new pg.Client(dsn)
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.pgClient.connect(error => {
        if (error) reject(error)
        else resolve()
      })
    })
  }

  disconnect() {
    return this.pgClient.end()
  }

  query(sql, ...args) {
    args = args.length ? args : undefined
    log.sql(sql, args)
    const context = {}
    Error.captureStackTrace(context, Client.prototype.query)
    return new Promise((resolve, reject) => {
      this.pgClient.query(sql, args, (err, result) => {
        if (err) {
          err.sql = sql
          err.stack = context.stack.replace(/^Error$/m, `Error: ${err.message}`)
          for (const p in err) if (err[p] === undefined) delete err[p]
          return reject(err)
        }
        log.result(result)
        resolve(result)
      })
    })
  }

  async exec() {
    await this.query(...arguments)
  }

  table() {
    return this.query(...arguments).then(result => result.rows)
  }

  column() {
    return this.query(...arguments).then(result =>
      result.rows.map(ea => {
        for (let p in ea) return ea[p]
      }),
    )
  }

  row() {
    return this.query(...arguments).then(result => result.rows[0])
  }

  value() {
    return this.query(...arguments).then(result => {
      for (let p in result.rows[0]) return result.rows[0][p]
    })
  }
}

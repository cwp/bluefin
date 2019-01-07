import mustache from 'mustache'
mustache.escape = text => text

export default class Template {
  static async fromFile(file) {
    const sql = await file.read()
    return new this(sql, file.relative)
  }

  constructor(sql, path) {
    this.sql = sql
    this.path = path
  }

  resolve(env) {
    if (!this.sql.replace) console.log(this)
    let sql = mustache.render(this.sql, env)
    sql = sql.trim()
    if (sql.slice(-1) !== ';') sql += ';'

    return sql
  }
}

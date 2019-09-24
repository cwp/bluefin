export default class Plan {
  constructor(programs, partials, env = {}) {
    this.programs = programs
    this.partials = partials
    this.env = env
  }

  async initialize(options = {}, modules = []) {
    for (const m of modules) await m.initialize(this, options)
  }

  async customize(options, database, modules = []) {
    await this.customizeEntity('role', database)
    await this.customizeEntity('schema', database)
    await this.customizeEntity('foreignDataWrapper', database)
    await this.customizeEntity('foreignServer', database)
    await this.customizeEntity('type', database)
    await this.customizeEntity('domain', database)

    const vows = this.programs.map(p => p.customize(options, database))
    await Promise.all(vows)

    for (const m of modules) await m.customize(this, options, database)
  }

  async customizeEntity(name, database) {
    const plural = name + 's'
    const names = name + 'Names'
    const entities = await database[plural]()
    this.env.has[plural] = entities.length > 0
    this.env[names] = entities.length ? entities.join(', ') : `<<no ${plural} present>>`
  }

  async finalize(options = {}, modules = []) {
    this.programs = this.programs.filter(p => !p.skip)
    for (const m of modules) await m.finalize(this, options)
  }

  async execute(client) {
    for (const p of this.programs) {
      const sql = p.sql(this.env, this.partials)
      if (sql) await client.exec(sql)
    }
  }

  get description() {
    const chunks = this.programs.map(p => p.description)
    return chunks.join('\n')
  }

  get json() {
    const chunks = this.programs.map(p => p.json)
    return JSON.stringify(chunks, undefined, 2)
  }

  get sql() {
    const chunks = this.programs.map(p => this.render(p)).filter(c => c !== null)
    return chunks.join('\n')
  }

  render(p) {
    return p.sql(this.env, this.partials);
  }

  reportError(e) {
    console.log()
    console.log(`Error: ${e.message}`)
    console.log()
    console.log(e.sql)
    console.log()


    for (let p in e) if (!ignoreErrorFields.includes(p) && e[p]) console.log(`${p}: ${e[p]}`)
  }
}

const ignoreErrorFields = ['name', 'file', 'line', 'routine', 'sql']

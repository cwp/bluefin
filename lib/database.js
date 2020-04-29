export default class Database {
  static stub() {
    const conf = {
      name: 'stub',
    }
    const inst = new this(conf)
    inst._connect = () => {
      throw new Error('This database is offline only!')
    }
    for (let name in sql) inst['_' + name] = []
    inst._maxMigrationOrdinal = null
    return inst
  }

  constructor(conf) {
    this.name = conf.name
    this._connect = () => conf.connect()
  }

  connect() {
    if (!this._dbClientVow) this._dbClientVow = this._connect()
    return this._dbClientVow
  }

  async disconnect() {
    if (this._dbClientVow) {
      const client = await this._dbClientVow
      if (client) await client.disconnect()
      delete this._dbClientVow
    }
  }

  flush() {
    for (let name in sql) delete this['_' + name]
    delete this._maxMigrationOrdinal
  }

  async join(name, fn) {
    const names = await this._get(name)
    if (names.length > 0) fn(names.join(', '))
  }

  async clear(name, fn) {
    await this.join(name, names => {
      fn(names)
      this['_' + name] = []
    })
  }

  async _get(name) {
    const uname = '_' + name
    if (!(uname in this)) {
      const client = await this.connect()
      if (!(name in sql)) console.log('sql = ' + name)
      this[uname] = await client.column(sql[name])
    }
    return this[uname]
  }

  maxMigrationOrdinal() {
    if (!('_maxMigrationOrdinal' in this)) {
      this._maxMigrationOrdinal = this.getMaxMigrationOrdinal()
    }
    return this._maxMigrationOrdinal
  }

  async getMaxMigrationOrdinal() {
    const schemas = await this.schemas()
    if (!schemas.includes('bluefin')) return null

    const client = await this.connect()
    return client.value('select max (ordinal) from bluefin.migrations')
  }
}

const sql = {}

sql.roles = `
select rolname
from pg_catalog.pg_roles
where rolname !~ '^pg_' and rolname !~ '^rds_' and rolname <> current_user
`

sql.sequences = `
select n.nspname || '.' || c.relname
from pg_catalog.pg_class c left join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where c.relkind in('S', '')
  and pg_catalog.pg_table_is_visible(c.oid)
  and pg_catalog.pg_get_userbyid(c.relowner) = current_user
`

sql.schemas = `
select n.nspname
from pg_catalog.pg_namespace n
where n.nspname !~ '^pg_'
  and n.nspname <> 'information_schema'
  and pg_catalog.pg_get_userbyid(n.nspowner) = current_user
`

sql.domains = `
select n.nspname || '.' || t.typname
from pg_catalog.pg_type t
  left join pg_catalog.pg_namespace n on n.oid = t.typnamespace
where t.typtype = 'd'
  and pg_catalog.pg_type_is_visible(t.oid)
  and pg_catalog.pg_get_userbyid(typowner) = current_user
`

sql.foreignDataWrappers = `
select fdw.fdwname
from pg_catalog.pg_foreign_data_wrapper fdw
where pg_catalog.pg_get_userbyid(fdw.fdwowner) = current_user
`

sql.foreignServers = `
select s.srvname
from pg_catalog.pg_foreign_server s
where pg_catalog.pg_get_userbyid(s.srvowner) = current_user
`

sql.functions = `
select n.nspname || '.' || p.proname
from pg_catalog.pg_proc p
  left join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where pg_catalog.pg_function_is_visible(p.oid)
  and n.nspname !~ '^pg_'
  and n.nspname <> 'information_schema'
  and pg_catalog.pg_get_userbyid(proowner) = current_user
`

sql.tables = `
select c.relname as name
from pg_catalog.pg_class c left join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r' and n.nspname = 'bluefin'
order by 1
`

sql.types = `
select n.nspname || '.' || pg_catalog.format_type(t.oid, null)
from pg_catalog.pg_type t
     left join pg_catalog.pg_namespace n on n.oid = t.typnamespace
where (t.typrelid = 0 or (select c.relkind = 'c' from pg_catalog.pg_class c where c.oid = t.typrelid))
  and not exists(select 1 from pg_catalog.pg_type el where el.oid = t.typelem and el.typarray = t.oid)
  and t.typtype <> 'd'
  and n.nspname !~ '^pg_'
  and n.nspname <> 'information_schema'
  and pg_catalog.pg_type_is_visible(t.oid)
  and pg_catalog.pg_get_userbyid(typowner) = current_user
`

sql.extensions = `
select extname from pg_extension
where pg_catalog.pg_get_userbyid(extowner) = current_user
`

for (let name in sql) {
  Database.prototype[name] = function() {
    return this._get(name)
  }
}

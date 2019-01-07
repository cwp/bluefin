import Client from '../lib/client'
import Database from '../lib/database'
import demand from 'must'
import {randomBytes} from 'crypto'

describe('database', () => {
  let dbName
  let database
  let pg
  let roleName
  let tag

  before(async () => {
    tag = randomBytes(4).toString('hex')
    dbName = `bluefin_test_${tag}`
    roleName = 'bluefin_test_role_' + tag
    pg = await Client.connect({database: 'postgres'})
    await pg.exec(`create database ${dbName}`)

    database = Database.stub()
    database.flush()
    database.name = dbName
    database._dbClientVow = Client.connect({database: dbName})
    const c = await database._dbClientVow
    await c.exec(prepareDatabaseSql(roleName))
  })

  after(async () => {
    if (database) await database.disconnect()
    if (pg) {
      await pg.exec(`drop database if exists ${dbName}`)
      await pg.exec(`drop role if exists ${roleName}`)
      await pg.disconnect()
    }
  })

  it('gets roles', async () => {
    const roles = await database.roles()
    roles.must.be.an(Array)
    roles.must.include(roleName)
  })

  it('gets sequences', async () => {
    const sequences = await database.sequences()
    sequences.must.eql(['public.test_sequence'])
  })

  it('gets schemas', async () => {
    const schemas = await database.schemas()
    schemas.must.eql(['public', 'test_schema'])
  })

  it('gets domains', async () => {
    const domains = await database.domains()
    domains.must.eql(['public.test_domain'])
  })

  it('gets foreign data wrappers', async () => {
    const fdw = await database.foreignDataWrappers()
    fdw.must.eql(['test_fdw'])
  })

  it('gets servers', async () => {
    const servers = await database.foreignServers()
    servers.must.eql(['test_server'])
  })

  it('gets functions', async () => {
    const functions = await database.functions()
    functions.must.eql(['public.test_function'])
  })

  it('gets types', async () => {
    const types = await database.types()
    types.must.eql(['public.test_type'])
  })

  it('gets large objects', async () => {
    const los = await database.largeObjects()
    los.must.eql([123])
  })
})

const prepareDatabaseSql = roleName => `
create role ${roleName};
create sequence test_sequence;
create domain test_domain as integer;
create schema test_schema;
create foreign data wrapper test_fdw;
create server test_server foreign data wrapper test_fdw;
create function test_function() returns integer as 'select 1' language sql;
create type test_type as enum();
select lo_create(123);
`

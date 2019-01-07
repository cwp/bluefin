import * as citus from '../lib/middleware/citus'

import Configuration from '../lib/configuration'
import Database from '../lib/database'
import vfs from './fixtures/citus'

const createPlan = async (conf, nickname) => {
  const plan = await conf.focus(nickname).plan()
  const database = Database.stub()
  database._extensions = ['citus']
  database._tables = ['migrations']
  database._maxMigrationOrdinal = null
  plan.initialize({}, [citus])
  await plan.customize({}, database, [citus])
  await plan.finalize({}, [citus])
  return plan
}

const query = async (conf, nickname) => {
  const plan = await createPlan(conf, nickname)
  const sql = plan.sql
  return sql.replace(/insert into bluefin.migrations.*\n/, '')
}

describe('citus middleware', () => {
  let conf

  before(async () => {
    conf = await Configuration.read('/conf.toml', vfs)
  })

  it('runs a migration on coordinator', async function() {
    const sql = await query(conf, 'c')
    sql.must.be('a nurf b;\n')
  })

  it('runs a migration on workers', async function() {
    const sql = await query(conf, 'w')
    sql.must.be('select run_command_on_workers($__bluefin__$a nurf b$__bluefin__$);\n')
  })

  it('runs a migration on shards', async function() {
    const sql = await query(conf, 's')
    sql.must.be("select run_command_on_shards('nurf', $__bluefin__$a %s b$__bluefin__$);\n")
  })

  it('runs a migration on placements', async function() {
    const sql = await query(conf, 'p')
    sql.must.be(
      "select run_command_on_placements('nurf', $__bluefin__$a %s b$__bluefin__$);\n",
    )
  })
})

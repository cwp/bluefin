import {Grant, Migration, Program, Role, Table} from '../lib/program'

import Configuration from '../lib/configuration'
import Plan from '../lib/plan'
import full from './fixtures/full'
import inheritance from './fixtures/inheritance'
import minimal from './fixtures/minimal'

const fixtures = {full, minimal}

const desc = (fixtureName, dbName, fn) => {
  describe(`configuration ${fixtureName}-${dbName}`, () => {
    const ctx = {}
    before(async () => {
      ctx.conf = await Configuration.read('/conf.toml', fixtures[fixtureName])
      ctx[dbName] = ctx.conf.focus(dbName)
    })

    fn(ctx)
  })
}

describe('inheritance', () => {
  it('merges one ancestor', async function() {
    const conf = await Configuration.read('/conf.toml', inheritance)
    const nork = conf.focus('nork')
    const {raw} = nork

    raw.env.foo.must.be(43)
    raw.env.bar.must.be(96)
    raw.env.nork.must.be.true()
  })

  it('merges two ancestors', async function() {
    const conf = await Configuration.read('/conf.toml', inheritance)
    const plonk = conf.focus('plonk')
    const {raw} = plonk

    raw.env.foo.must.be(43)
    raw.env.bar.must.be(97)
    raw.env.baz.must.be(161)
    raw.env.nork.must.be.true()
    raw.env.plonk.must.be.true()
  })
})

desc('full', 'prod', ctx => {
  it('constructs a configuration', function() {
    ctx.conf.directory.must.equal('/')
    ctx.conf.file.must.equal('conf.toml')
    ctx.conf.raw.must.be.an(Object)
    ctx.conf.fs.must.be(full)
  })

  it('throws an error for unknown databases', function() {
    const fn = () => ctx.conf.focus('nork')
    fn.must.throw('Unknown database nork')
  })

  it('supplies plans for a named database', async function() {
    const plan = await ctx.prod.plan()
    plan.must.be.a(Plan)
  })

  it('gets the destroy template if rebuild is true', async function() {
    const destroy = await ctx.prod.destroyPhase({rebuild: true})
    destroy.must.be.an(Array)
    destroy.must.have.length(1)
    const tmpl = destroy[0]
    tmpl.must.be.a(Program)
    tmpl.sql.must.not.include('has.foreignDataWrappers')
  })

  it('gets an empty destroy phase if rebuild is false', async function() {
    const phase = await ctx.prod.destroyPhase({rebuild: false})
    phase.must.be.an(Array)
    phase.must.be.empty()
  })

  it('gets an empty graph phase if grants is false', async function() {
    const phase = await ctx.prod.grantPhase({grants: false})
    phase.must.be.an(Array)
    phase.must.be.empty()
  })

  it('gets a grant phase if grants is true', async function() {
    const phase = await ctx.prod.grantPhase({grants: true, rebuild: true})
    phase.must.be.an(Array)
    phase.must.have.length(2)

    const [p1, p2] = phase
    p1.must.be.a(Role)
    p2.must.be.a(Grant)
  })

  it('gets migrations', async function() {
    const phase = await ctx.prod.migrationPhase({})
    phase.must.be.an(Array)
    phase.must.have.length(4)

    const [p1, p2, p3] = phase
    p1.must.be.a(Table)
    p1.env.table.must.be('migrations')
    p2.must.be.a(Migration)
    p2.ordinal.must.be(1)
    p3.must.be.a(Migration)
    p3.ordinal.must.be(2)
  })

  it('honors options.first when present', async function() {
    const phase = await ctx.prod.migrationPhase({first: 2})
    phase.must.be.an(Array)

    for (let i = 1; i < phase.length; i++) phase[i].ordinal.must.be.above(1)
  })

  it('honors options.last when present', async function() {
    const phase = await ctx.prod.migrationPhase({last: 2})
    phase.must.be.an(Array)

    for (let i = 1; i < phase.length; i++) phase[i].ordinal.must.be.below(3)
  })

  it('creates a default environment', async function() {
    const env = ctx.prod.createEnvironment()
    env.must.be.an(Object)
  })
})

desc('minimal', 'app', ctx => {
  it('gets a default destroy template', async function() {
    const destroy = await ctx.app.destroyPhase({rebuild: true})
    destroy.must.be.an(Array)
    destroy.must.have.length(1)
    const p = destroy[0]
    p.must.be.a(Program)
    p.tmpl.must.include('has.foreignDataWrappers')
  })
})

// TODO: test multiple templates specified

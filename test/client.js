import Client from '../lib/client'
import demand from 'must'

const dsn = {}

describe('client', () => {
  let c
  before(async () => {
    c = await Client.connect(dsn)
  })

  after(async () => {
    if (c) await c.disconnect()
  })

  it('it does a simple query', async () => {
    const result = await c.query('select 1 as num')
    result.must.be.an(Object)
    result.command.must.equal('SELECT')
    result.rowCount.must.equal(1)
    result.rows.length.must.equal(1)
    result.rows[0].num.must.equal(1)
  })

  it('it does a query with args', async () => {
    const result = await c.query('select $1::integer as num', 42)
    result.must.be.an(Object)
    result.command.must.equal('SELECT')
    result.rowCount.must.equal(1)
    result.rows.length.must.equal(1)
    result.rows[0].num.must.equal(42)
  })

  it('swallows the result with exec', async () => {
    const result = await c.exec('select $1::integer as num', 42)
    demand(result).be.undefined()
  })

  it('returns a table', async () => {
    const result = await c.table('select 1 as num')
    result.must.be.an(Array)
    result.length.must.equal(1)
    result[0].must.be.an(Object)
    result[0].must.have.keys(['num'])
    result[0].num.must.equal(1)
  })

  it('returns a column', async () => {
    const result = await c.column('select generate_series(1, 3)')
    result.must.eql([1, 2, 3])
  })

  it('returns a row', async () => {
    const result = await c.row('select 1 as one, 2 as two, 3 as three')
    const row = Object.assign({}, result) // pg produces weird row objects
    row.must.eql({one: 1, two: 2, three: 3})
  })

  it('returns a value', async () => {
    const result = await c.value('select 1')
    result.must.equal(1)
  })
})

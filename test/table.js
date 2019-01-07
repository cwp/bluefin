import Database from '../lib/database'
import Path from '../lib/path'
import {Table} from '../lib/program'
import nodeFs from 'fs'

describe('table', () => {
  let table
  before(() => {
    const path = new Path(nodeFs, '/', 'create.sql')
    table = new Table('create table {{table}};', path, {table: 'glorp'})
  })

  it('has a description', function() {
    table.description.must.be('create table bluefin.glorp')
  })

  it('is not skipped when rebuilding', async function() {
    const db = Database.stub()
    db._tables = ['glorp']
    await table.customize({rebuild: true}, db)
    table.skip.must.be.false()
  })

  it('is skipped when the table is already present', async function() {
    const db = Database.stub()
    db._tables = ['glorp']
    await table.customize({rebuild: false}, db)
    table.skip.must.be.true()
  })

  it('is run when table is missing', async function() {
    const db = Database.stub()
    await table.customize({rebuild: false}, db)
    table.skip.must.be.false()
  })
})

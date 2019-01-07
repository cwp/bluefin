import Database from '../lib/database'
import Path from '../lib/path'
import {Role} from '../lib/program'
import nodeFs from 'fs'

describe('role', () => {
  let role
  before(() => {
    const path = new Path(nodeFs, '/', 'create.sql')
    role = new Role('create role {{role}};', path, {role: 'glorp'})
  })

  it('has a description', function() {
    role.description.must.be('create role glorp')
  })

  it('skips when the role exists', async function() {
    const db = Database.stub()
    db._roles = ['glorp']
    await role.customize({}, db)
    role.skip.must.be.true()
  })

  it('runs when the role is not present', async function() {
    const db = Database.stub()
    await role.customize({}, db)
    role.skip.must.be.false()
  })
})

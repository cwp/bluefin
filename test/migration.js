import Database from '../lib/database'
import {Migration} from '../lib/program'
import Path from '../lib/path';
import vfs from './fixtures/simple.js'

const p = basename => new Path(vfs, '/migrations', basename)

describe('migration', () => {
  describe('creation', () => {
    it('parses filenames', () => {
      const m = new Migration('ignore', p('1-test.sql'))
      m.ordinal.must.equal(1)
      m.name.must.equal('test')
    })

    it('handles leading zeros', () => {
      const m = new Migration('ignore', p('001-test.sql'))
      m.ordinal.must.equal(1)
      m.name.must.equal('test')
    })

    it('handles multi-dash-name', () => {
      const m = new Migration('ignore', p('001-multi-dash-name.sql'))
      m.ordinal.must.equal(1)
      m.name.must.equal('multi-dash-name')
    })

    it('handles camelCaseName', () => {
      const m = new Migration('ignore', p('001-camelCaseName.sql'))
      m.ordinal.must.equal(1)
      m.name.must.equal('camelCaseName')
    })

    it('handles underscore_name', () => {
      const m = new Migration('ignore', p('001-underscore_name.sql'))
      m.ordinal.must.equal(1)
      m.name.must.equal('underscore_name')
    })

    it('throws on no ordinal', () => {
      const create = () => new Migration('ignore', p('gong.sql'))
      create.must.throw(Error, "Malformed filename 'gong.sql'")
    })

    it('throws on no SQL extension', () => {
      const create = () => new Migration('ignore', p('001-gong'))
      create.must.throw(Error, "Malformed filename '001-gong'")
    })
  })

  describe('customize', () => {
    let migration
    before(() => {
      const path = new Path(null, '/', '03-nothing.sql')
      migration = new Migration('', path)
    })

    it('skips if less than maxMigrationOrdinal', async function() {
      const db = Database.stub()
      db._maxMigrationOrdinal = 5
      await migration.customize({}, db)
      migration.skip.must.be.true()
    })

    it('skips if equal to maxMigrationOrdinal', async function() {
      const db = Database.stub()
      db._maxMigrationOrdinal = 3
      await migration.customize({}, db)
      migration.skip.must.be.true()
    })

    it('runs if greater than maxMigrationOrdinal', async function() {
      const db = Database.stub()
      db._maxMigrationOrdinal = 1
      await migration.customize({}, db)
      migration.skip.must.be.false()
    })
  })
})

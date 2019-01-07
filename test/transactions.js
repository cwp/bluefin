import * as txn from '../lib/middleware/transactions'

import Configuration from '../lib/configuration'
import Database from '../lib/database'
import {Migration} from '../lib/program'
import vfs from './fixtures/transactions'

describe('transaction middleware', () => {
  let conf

  before(async () => {
    conf = await Configuration.read('/conf.toml', vfs)
  })

  it('wraps a plan in a transaction', async function() {
    const plan = await conf.focus('simple').plan()
    const len = plan.programs.length
    txn.initialize(plan)
    plan.programs.must.be.an.array()
    plan.programs.must.have.length(len+2)
    plan.programs[0].must.be.an.instanceOf(txn.Begin)
    plan.programs[len+1].must.be.an.instanceOf(txn.Commit)
  })
})

import Plan from '../lib/plan'
import {Program} from '../lib/program'
import {writeToMemory} from './lib/stream'

describe('plan', () => {
  let plan

  before(() => {
    plan = new Plan(1, 2)
    plan.programs = [new Program('one'), new Program('two')]
  })

  it('produces JSON', () => {
    const chunks = JSON.parse(plan.json)
    chunks.must.have.length(2)
    chunks[0].must.eql({tmpl: 'one', skip: false, env: {}})
    chunks[1].must.eql({tmpl: 'two', skip: false, env: {}})
  })
})

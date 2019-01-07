import Path from '../lib/path'
import {Program} from '../lib/program'

describe('program', () => {
  it('resolves parameters', () => {
    const p = new Program('SELECT {{arb}} AS num')
    const sql = p.sql({arb: 42})
    sql.must.equal('SELECT 42 AS num;\n')
  })

  it('ignores unrecognized variables', () => {
    const p = new Program('SELECT {{arb}} AS num')
    const sql = p.sql({})
    sql.must.equal('SELECT  AS num;\n')
  })

  it('converts to JSON', () => {
    const program = new Program('SELECT 1', new Path(null, null, 'test.sql'))
    program.json.must.eql({tmpl: 'SELECT 1', path: 'test.sql', skip: false, env: {}})
  })
})

import TOML from '@iarna/toml'
import memfs from 'memfs'

const conf = {}
const db = nick => {
  conf[nick] = {
    database: 'txntest',
    migrations: `migrations/${nick}`,
    middleware: ['citus'],
    env: {table: 'nurf'}
  }
}
db('c')
db('w')
db('s')
db('p')

const toml = TOML.stringify(conf)
export default memfs.Volume.fromJSON({
  '/conf.toml': toml,
  '/migrations/c/001-one.sql': '{{#table}}{{#coordinator}}a %s b{{/coordinator}}{{/table}}',
  '/migrations/w/001-one.sql': '{{#table}}{{#workers}}a %s b{{/workers}}{{/table}}',
  '/migrations/s/001-one.sql': '{{#table}}{{#shards}}a %s b{{/shards}}{{/table}}',
  '/migrations/p/001-one.sql': '{{#table}}{{#placements}}a %s b{{/placements}}{{/table}}',
})

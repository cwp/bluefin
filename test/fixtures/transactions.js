import TOML from '@iarna/toml'
import memfs from 'memfs'

function template(strings, ...values) {
  const trimmed = strings.map(s => s.replace(/^    /g, ''))
  let t = trimmed.slice(0, 1)
  for (let i = 1, l = trimmed.length; i < l; i++) {
    t.push(trimmed[i])
    t.push(values[i - 1])
  }
  return t.join()
}

const conf = {
  simple: {
    database: 'txntest',
    migrations: 'migrations/simple',
    middleware: ['transactions']
  },
  exclude1: {
    database: 'txntest',
    migrations: 'migrations/exclude1',
    middleware: ['transactions']
  },
  exclude2: {
    database: 'txntest',
    migrations: 'migrations/exclude2',
    middleware: ['transactions']
  },
  exclude3: {
    database: 'txntest',
    migrations: 'migrations/exclude3',
    middleware: ['transactions']
  },
}

export default memfs.Volume.fromJSON({
  '/conf.toml': TOML.stringify(conf),
  '/migrations/simple/001-one.sql': template`
    one
  `,
  '/migrations/simple/002-two.sql': template`
    two
  `,
  '/migrations/simple/003-three.sql': template`
    three
  `,
  '/migrations/exclude1/001-one.sql': template`
    one
  `,
  '/migrations/exclude1/002-two.sql': template`
    two
  `,
  '/migrations/exclude1/003-three.sql': template`
    three a
    --* transaction boundary
    three b
  `,
  '/migrations/exclude1/004-four.sql': template`
    four
  `,
  '/migrations/exclude1/005-five.sql': template`
    five
  `,
  '/migrations/exclude2/001-one.sql': template`
    --* transactions exclude
    one
  `,
  '/migrations/exclude2/002-two.sql': template`
    two
  `,
  '/migrations/exclude3/001-one.sql': template`
    one
  `,
  '/migrations/exclude3/002-two.sql': template`
    --* transactions exclude
    two
  `,})

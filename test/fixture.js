import Client from '../lib/client'
import {create} from '../fixture'
import {formatWithOptions} from 'util'
import vfs from './fixtures/messages'

describe('fixture', async () => {
  it('creates and destroys a database', async function() {
    // create the database
    const endpoint = {
      hostname: 'localhost',
      port: 5432,
      database: 'postgres',
    }
    const confFilePath = '/conf.toml'
    const fixture = await create(endpoint, confFilePath, 'fix', vfs)

    // we have a database
    const c = await Client.connect(fixture.endpoint)
    const result = await c.query('select * from messages where id = $1', 1)
    result.rows.must.be.empty()
    result.fields[0].name.must.be('id')
    c.disconnect()

    // destroy the database
    await fixture.destroy()

    // now we can't connect
    const vow = Client.connect(fixture.endpoint)
    await vow.must.reject.instanceOf(Error)
  })
})

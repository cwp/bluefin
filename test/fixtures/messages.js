import memfs from 'memfs'

function template(strings, ...values) {
  const trimmed = strings.map(s => s.replace(/^\s+/g, ''))
  let t = trimmed.slice(0, 1)
  for (let i = 1, l = trimmed.length; i < l; i++) {
    t.push(trimmed[i])
    t.push(values[i - 1])
  }
  return t.join()
}

export default memfs.Volume.fromJSON({
  '/conf.toml': template`
    [fix]
    host = "localhost"
    port = 5432
    database = "fixture_tests"
    migrations = "migrations"

    [fix.grants]
    api = "grants/api.sql"
  `,

  '/migrations/001-users.sql': template`
    create table users (
      id serial primary key,
      email text
    )
  `,

  '/migrations/002-messages.sql': template`
    create table messages (
      id serial primary key,
      sender_id int not null references users(id),
      receiver_id int not null references users(id),
      sent_at timestamp without time zone not null,
      content text
    )
  `,

  '/grants/api.sql': template`
    grant usage on schema public to api;
    grant select, insert, update, delete on all tables in schema public to api;
  `
})

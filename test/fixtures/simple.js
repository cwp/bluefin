import memfs from 'memfs'
import TOML from '@iarna/toml'

function template(strings, ...values) {
  const trimmed = strings.map(s => s.replace(/^\s+/g, '').replace(/\s+/g, ' '))
  let t = trimmed.slice(0, 1)
  for (let i = 1, l = trimmed.length; i < l; i++) {
    t.push(trimmed[i])
    t.push(values[i - 1])
  }
  return t.join()
}

const conf = {
  bft: {
    database: 'bluefin_test',
    migrations: 'migrations/season',
    grants: {
      app1: ['grants/reader.sql'],
      app2: ['grants/reader.sql', 'grants/writer.sql'],
    }
  },
}

export default memfs.Volume.fromJSON({
  'conf.toml': TOML.stringify(conf),

  'migrations/season/001-create-team.sql': template`
    CREATE SCHEMA basketball;

    CREATE TABLE basketball.team (
      id serial PRIMARY KEY,
      name text NOT NULL,
      city text NOT NULL
    )`,

  'migrations/season/002-create-game.sql': template`
    CREATE TABLE basketball.game (
      id serial PRIMARY KEY,
      home_team integer NOT NULL REFERENCES basketball.team(id),
      away_team integer NOT NULL REFERENCES basketball.team(id),
      home_score smallint,
      away_score smallint,
      started timestamp with time zone,
      CONSTRAINT positive_home_score CHECK (home_score >= 0),
      CONSTRAINT positive_away_score CHECK (away_score >= 0)
    )`,

  'grants/reader.sql': template`
    ALTER ROLE @role SET search_path = basketball;

    GRANT USAGE ON SCHEMA basketball TO @role;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA basketball TO @role;
    GRANT SELECT ON ALL TABLES IN SCHEMA basketball TO @role`,

  'grants/writer.sql': template`
    ALTER ROLE @role SET search_path = basketball;

    GRANT USAGE ON SCHEMA basketball TO @role;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA basketball TO @role;
    GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA basketball TO @role`,

  'grants/utc.sql': template`
    ALTER ROLE @role SET timezone = 'UTC'`,
})

import TOML from '@iarna/toml'
import memfs from 'memfs'

const conf = {
  prod: {
    database: 'appdata',
    safety: true,
    migrations: 'migrations/season',
    templates: {
      destroy: 'destroy.sql',
      revoke: 'revoke.sql'
    },
    roles: {
      app1: 'create-role.sql'
    },
    grants: {
      app1: 'grants/reader.sql',
    },
    env: {
      schema: 'baseball',
    },
  },
}

export default memfs.Volume.fromJSON({
  '/conf.toml': TOML.stringify(conf),
  '/create-role.sql': `
    create role {{role}};
  `,
  '/destroy.sql': `
    {{#has.schemas}}
    drop schema {{schemaNames}} cascade;
    {{/has.schemas}}
  `,
  '/revoke.sql': `
  revoke all on database {{database}} from {{roleNames}};
  `,
  '/migrations/season/001-create-team.sql': `
    CREATE TABLE team (
      id serial PRIMARY KEY,
      name text NOT NULL,
      city text NOT NULL
    )`,
  '/migrations/season/002-create-game.sql': `
    CREATE TABLE game (
      id serial PRIMARY KEY,
      home_team integer NOT NULL REFERENCES team(id),
      away_team integer NOT NULL REFERENCES team(id),
      home_score smallint,
      away_score smallint,
      started timestamp with time zone,
      CONSTRAINT positive_home_score CHECK (home_score >= 0),
      CONSTRAINT positive_away_score CHECK (away_score >= 0)
    )`,
    '/migrations/season/003-create-inning.sql': `
    CREATE TABLE game (
      id serial PRIMARY KEY,
      game integer not null references game(id),
      top integer not null,
      bottom integer not null
    )`,
  '/grants/reader.sql': `
    ALTER ROLE @role SET search_path = @schema
    ALTER DEFAULT PRIVILEGES IN SCHEMA @schema GRANT USAGE ON SEQUENCES TO @role
    ALTER DEFAULT PRIVILEGES IN SCHEMA @schema GRANT SELECT TABLES TO @role

    GRANT USAGE ON SCHEMA @schema TO @role
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA @schema TO @role
    GRANT SELECT ON ALL TABLES IN SCHEMA @schema TO @role;`,
  '/grants/writer.sql': `
    ALTER ROLE @role SET search_path = @schema
    ALTER DEFAULT PRIVILEGES IN SCHEMA @schema GRANT USAGE ON SEQUENCES TO @role
    ALTER DEFAULT PRIVILEGES IN SCHEMA @schema
      GRANT SELECT, INSERT, UPDATE, DELETE TABLES TO @role

    GRANT USAGE ON SCHEMA @schema TO @role
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA @schema TO @role
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON ALL TABLES IN SCHEMA @schema TO @role;`,
})

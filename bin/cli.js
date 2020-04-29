#!/usr/bin/env node

require = require('esm')(module)
const program = require('commander')
const {run, migrate} = require('../lib/commands')

program.version('0.0.2').option('-c --conf <path>', 'Use this configuration file')

program
  .command('migrate <db>')
  .description('Apply migrations to a database')
  .option('-g --no-grants', 'Do not apply grants')
  .option('-m --no-migrations', 'Do not apply migrations')
  .option('-n --noop', 'Do not modify the database')
  .option('-a --abstract', 'Do not connect to the database at all (implies --noop)')
  .option('-r --rebuild', 'First destroy the existing database')
  .option('-f --first <ordinal>', 'Skip all migrations before this number', parseInt)
  .option('-l --last <ordinal>', 'Skip all migrations after this number', parseInt)
  .option('-q --quiet', 'Do not write a description to stdout')
  .option('--sql', 'Write the migrations as SQL to stdout')
  .option('--json', 'Describe the migrations in JSON format on stdout')
  .action((dbName, cmd) => {
    const options = {}
    for (let opt of ['first', 'last']) options[opt] = cmd[opt]
    for (let opt of ['grants', 'migrations', 'rebuild', 'noop', 'abstract', 'quiet', 'sql', 'json'])
      options[opt] = !!cmd[opt]
    if (options.abstract) options.noop = true

    fpath = cmd.parent.conf || process.env.BLUEFIN_CONF || 'conf.toml'

    return run(migrate, dbName, fpath, options)
  })

program.parse(process.argv)

import { default as mkDebug } from 'debug'

const debug = mkDebug('bluefin:client')

export function sql(sql, args) {
  sql = sql.replace(/\s+/g, ' ')
  debug('query ', sql.trim())
  if (args && args.length) debug('  arg %j', args)
}

export function result(result) {
  if (result.rows && result.rows.length)
    for (let r of result.rows) debug('  row %o', Object.assign({}, r))
}

export function error(err) {
  const o = {}
  for (let p in err) if (err[p] !== undefined) o[p] = err[p]
  debug(err.message)
  debug(err.stack)
  debug('  %o', o)
}

export default {sql, result, error}

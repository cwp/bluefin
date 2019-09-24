import Program from '../program'
import Sequence from '../sequence'
import {generateKeyPair} from 'crypto'
import mustache from 'mustache'

const quote = '$__bluefin__$'
const end = `${quote});\n\n`

export function initialize(plan, options) {
  plan.env.coordinator = runOnCoordinator
}

export async function customize(plan, options, database) {
  plan.env.has.citus = await database.hasCitus()
  if (plan.env.has.citus) {
    plan.env.workers = runOnWorkers
    plan.env.shards = runOnShards
    plan.env.placements = runOnPlacements
  }
}

const runOnCoordinator = () =>
  function(section, render) {
    const tmpl = render(section).replace('%s', '{{.}}')
    return render(tmpl)
  }

const runOnWorkers = () =>
  function(section, render) {
    const tmpl = render(section).replace('%s', '{{.}}')
    return render(`select run_command_on_workers(${quote}${tmpl}${end}`)
  }

const runOnShards = () =>
  function(section, render) {
    const tmpl = `select run_command_on_shards('{{.}}', ${quote}${section}${end}`
    return render(tmpl)
  }

const runOnPlacements = () =>
  function(section, render) {
    const tmpl = `select run_command_on_placements('{{.}}', ${quote}${section}${end}`
    return render(tmpl)
  }

export function finalize() {}

export default {initialize, customize, finalize}

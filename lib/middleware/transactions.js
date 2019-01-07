import {Program} from '../program'

export class Begin extends Program {
  description = 'begin'
  constructor(tmpl, source, env) {
    tmpl = tmpl || 'begin'
    super(tmpl, source, env)
  }
}

export class Commit extends Program {
  description = 'commit'
  constructor(tmpl, source, env) {
    tmpl = tmpl || 'commit;'
    super(tmpl, source, env)
  }
}

export function initialize(plan, options = {}) {
  plan.programs.unshift(new Begin())
  plan.programs.push(new Commit())
}

export function finalize(plan, options) {}

export function customize(plan, options, database) {}

export default {initialize, customize, finalize}

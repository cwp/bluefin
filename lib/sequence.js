export default class Sequence {
  constructor(programs = []) {
    this.meta = {}
    this.programs = programs
  }

  recurse(doFn, sepFn) {
    if (this.programs.length == 0) return
    doFn(this.programs[0])
    for (let i = 1; i < this.programs.length; i++) {
      sepFn()
      doFn(this.programs[i])
    }
  }

  addToExecution(query) {
    this.programs.forEach(ea => ea.addToExecution(query))
  }

  writeTreeOn(out, level = 0) {
    this.recurse(p => p.writeTreeOn(out, level + 1), () => out.write('\n'))
  }

  asJson(chunks =  []) {
    for (let p of this.programs) p.asJson(chunks)
    return chunks
  }
}

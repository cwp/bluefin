import path from 'path'

export default class Path {
  constructor(fs, base, relative) {
    this.fs = fs
    this.base = base
    this.relative = relative
  }

  get absolute() {
    return path.resolve(this.base, this.relative)
  }

  get basename() {
    return path.basename(this.resolve())
  }

  directory() {
    const absolute = path.resolve(this.base, path.dirname(this.relative))
    const relative = path.relative(this.base, absolute)
    return new Path(this.fs, this.base, relative)
  }

  resolve() {
    return path.resolve(this.base, this.relative)
  }

  readdir() {
    const absolute = this.resolve()
    return new Promise((resolve, reject) => {
      this.fs.readdir(absolute, (err, names) => {
        if (err) reject(err)
        else {
          resolve(names.map(v => {
            const relative = path.join(this.relative, v);
            return new Path(this.fs, this.base, relative)
          }))
        }
      })
    })
  }

  read() {
    const absolute = this.resolve()
    return new Promise((resolve, reject) => {
      this.fs.readFile(absolute, 'utf8', (err, data) => {
        if (err) reject(err)
        resolve(data)
      })
    })
  }
}

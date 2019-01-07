import memfs from 'memfs'

const conf = `
[app]
database = "app"
`

export default memfs.Volume.fromJSON({
  '/conf.toml': conf,
})

import memfs from 'memfs'

const conf = `
[base]
database = "app"

[base.env]
foo = 42
bar = 96
baz = 161

[nork]
inherit = "base"
env.foo = 43
env.nork = true

[plonk]
inherit = ["base", "nork"]
env.bar = 97
env.plonk = true
`

export default memfs.Volume.fromJSON({
  '/conf.toml': conf,
})

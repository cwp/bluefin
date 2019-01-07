
import MemoryStream from 'memorystream'

export function writeToMemory(fn) {
  return new Promise((resolve, reject) => {
    let output = ''
    const out = new MemoryStream()
    out.on('error', reject)
    out.on('data', buf => (output += buf))
    out.on('finish', () => resolve(output))
    fn(out)
    out.end()
  })
}

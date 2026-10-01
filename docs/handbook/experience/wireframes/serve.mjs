import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const root = import.meta.dirname
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' }

createServer(async (req, res) => {
  const path = req.url.split('?')[0]
  const file = path === '/' ? 'wireframe.html' : path.slice(1)
  try {
    const data = await readFile(join(root, file))
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
}).listen(4174, () => console.log('serving on http://localhost:4174'))

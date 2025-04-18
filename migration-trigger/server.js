import Fastify from 'fastify'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const fastify = Fastify({ logger: true })

const PORT = process.env.PORT || '3001';
const MIG_DIR = process.env.MIG_DIR || path.join(__dirname, 'project')
const MIG_PID_PATH = path.join(__dirname, '.migrate-pid')

// `/` にアクセスすると HTML フォームを返す
fastify.get('/', async (req, reply) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Git Ref Migrator</title>
    </head>
    <body>
      <h1>Git Ref Migrator</h1>
      <form action="/" method="GET" onsubmit="event.preventDefault(); location.href='/' + document.getElementById('ref').value">
        <input type="text" id="ref" name="ref" placeholder="Enter git-ref" required />
        <button type="submit">Migrate</button>
      </form>
    </body>
    </html>
  `
  return reply.type('text/html').send(html)
})

// `/{git-ref}` にアクセスされたときの処理
fastify.get('/:ref', async (req, reply) => {
  const ref = req.params.ref

  reply.raw.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })

  try {
    // 既存プロセス停止
    if (fs.existsSync(MIG_PID_PATH)) {
      const pid = fs.readFileSync(MIG_PID_PATH, 'utf-8')
      try {
        process.kill(pid, 'SIGTERM')
        reply.raw.write(`[INFO] Killed existing process with PID ${pid}\n`)
      } catch (e) {
        reply.raw.write(`[WARN] Failed to kill PID ${pid}: ${e.message}\n`)
      }
    }

    // git switch とビルドコマンドを順に実行
    const command = `cd ${MIG_DIR} && git switch ${ref} && pnpm install --frozen-lockfile && pnpm build && pnpm migrate && pnpm start`
    const child = spawn(command, { shell: '/bin/bash' })

    const pid = child.pid.toString()
    fs.writeFileSync(MIG_PID_PATH, pid)
    reply.raw.write(`[INFO] Started new process with PID ${pid}\n\n`)

    child.stdout.on('data', (data) => {
      reply.raw.write(data)
    })
    child.stderr.on('data', (data) => {
      reply.raw.write(data)
    })
    child.on('close', (code) => {
      reply.raw.end(`\n[INFO] Process exited with code ${code}\n`)
    })
  } catch (err) {
    reply.raw.end(`[ERROR] ${err.message}`)
  }
})

const start = async () => {
  try {
    await fastify.listen({ port: PORT })
    console.log(`Server running at http://localhost:${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

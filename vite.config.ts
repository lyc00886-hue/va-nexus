import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))
let publicPagesBuilt = false

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'va-nexus-class-invite-dev',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const path = req.url?.split('?')[0]
          if (path !== '/api/class-invite') return next()
          try {
            const mod = (await server.ssrLoadModule('/api/class-invite.ts')) as {
              handleClassInvite: (request: Request) => Promise<Response>
            }
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            const body = Buffer.concat(chunks)
            const host = req.headers.host ?? 'localhost'
            const headers = new Headers()
            const contentType = req.headers['content-type']
            if (typeof contentType === 'string') headers.set('content-type', contentType)
            if (typeof req.headers.origin === 'string') headers.set('origin', req.headers.origin)
            const request = new Request(`http://${host}${req.url}`, {
              method: req.method,
              headers,
              body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
            })
            const response = await mod.handleClassInvite(request)
            res.statusCode = response.status
            response.headers.forEach((value, key) => {
              res.setHeader(key, value)
            })
            res.end(Buffer.from(await response.arrayBuffer()))
          } catch (error) {
            res.statusCode = 500
            res.end(error instanceof Error ? error.message : 'invite route failed')
          }
        })
      },
    },
    {
      name: 'va-nexus-public-pages',
      apply: 'build',
      closeBundle() {
        if (publicPagesBuilt) return
        publicPagesBuilt = true
        const result = spawnSync(process.execPath, ['scripts/publish-public-pages.mjs'], {
          cwd: root,
          stdio: 'inherit',
        })
        if (result.status !== 0) {
          throw new Error(`public pages build failed (${result.status ?? 'no status'})`)
        }
      },
    },
  ],
})

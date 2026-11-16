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

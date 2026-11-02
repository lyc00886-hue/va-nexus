# VA-Nexus AI

Lean HKDSE Visual Arts MVP (PWA-style SPA): East/West artist compare, SBA 六步闖關, Feldman writing + oral→DSE vocab, SEN UI modes.

## Stack

- Vite + React + TypeScript + Tailwind CSS
- lucide-react
- Supabase (Auth / Postgres / Storage — env placeholders)
- Gemini Flash (env placeholder)

Supabase project id: `omebvlizklukliztrbia` (tables `artists`, `artist_pairs` with public read RLS).

## Local run

```bash
cp .env.example .env
# fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GEMINI_API_KEY when ready
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Deploy (Vercel)

1. Import this GitHub repo in Vercel (Hobby / free).
2. Framework preset: Vite. Build `npm run build`, output `dist`.
3. Add the same `VITE_*` env vars in the Vercel project settings.
4. Redeploy after env changes.

## MVP tabs

1. **藝術家對比** — 20 mock artists / 10 pairs (same shape as Supabase)
2. **SBA 六步** — unlock + local evidence preview (Storage later)
3. **費德曼寫作** — 4 steps + client-side oral→DSE dictionary
4. **SEN toggle** — standard / SPLD (larger type) / ADHD (focus tunnel timer)
5. **Google sign-in** — placeholder until Supabase Auth is wired

## Scripts

| Command        | Purpose              |
|----------------|----------------------|
| `npm run dev`  | Local dev server     |
| `npm run build`| Typecheck + production build |
| `npm run preview` | Preview production build |

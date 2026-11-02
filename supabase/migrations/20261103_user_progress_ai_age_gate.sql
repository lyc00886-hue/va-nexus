-- Applied via Supabase MCP apply_migration "user_progress_ai_age_gate" (2026-11-03)
-- Age gate for Gemini AI (18+). birth_year is sensitive: owner-only via existing RLS.
-- can_use_ai is the derived permission flag used by the UI; never send birth_year to LLMs/exports.
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS birth_year integer
    CHECK (birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= 2100)),
  ADD COLUMN IF NOT EXISTS can_use_ai boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_progress.birth_year IS
  'Private birth year for 18+ AI gate. Owner-only RLS. Never export or send to LLMs.';
COMMENT ON COLUMN public.user_progress.can_use_ai IS
  'Derived flag: true when birth_year implies age >= 18. Used for UI/permissions only.';

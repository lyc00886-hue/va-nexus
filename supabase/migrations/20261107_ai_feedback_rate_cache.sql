-- Per-user Gemini usage and short-TTL feedback cache for /api/feedback.
-- Stores a content hash, the feedback text, and timestamps only.
-- Never store birth_year, images, or the student's raw writing.

create table public.ai_feedback_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode text not null check (mode in ('feldman', 'sba')),
  stage text not null default '' check (char_length(stage) <= 16),
  locale text not null check (locale in ('zh-Hant', 'zh-Hans', 'en')),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  feedback text not null check (char_length(feedback) between 1 and 8000),
  created_at timestamptz not null default now()
);

comment on table public.ai_feedback_cache is
  'Owner-scoped Gemini cache and rolling-hour usage. Hash + feedback text + timestamps only. No birth_year, images, or raw student text.';

comment on column public.ai_feedback_cache.content_hash is
  'SHA-256 of normalized writing plus step metadata (artwork, step label, photo count). Not the writing itself.';

comment on column public.ai_feedback_cache.feedback is
  'Formative comment text returned to that user. No scores, grades, or image bytes.';

create index ai_feedback_cache_user_created_idx
  on public.ai_feedback_cache (user_id, created_at desc);

create index ai_feedback_cache_lookup_idx
  on public.ai_feedback_cache (user_id, mode, stage, locale, content_hash, created_at desc);

alter table public.ai_feedback_cache enable row level security;

revoke all on table public.ai_feedback_cache from public, anon, authenticated;
grant select, insert on table public.ai_feedback_cache to authenticated;

create policy "ai_feedback_cache owner select"
  on public.ai_feedback_cache
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "ai_feedback_cache owner insert"
  on public.ai_feedback_cache
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Stamp the row from the session so a client cannot backdate usage or write another user's id.
create or replace function public.ai_feedback_cache_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  new.created_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.ai_feedback_cache_stamp() from public, anon, authenticated;

create trigger ai_feedback_cache_stamp
  before insert on public.ai_feedback_cache
  for each row execute function public.ai_feedback_cache_stamp();

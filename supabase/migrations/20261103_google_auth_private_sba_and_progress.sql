-- Applied via Supabase MCP apply_migration "google_auth_private_sba_and_progress" (2026-11-03)
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

-- Private SBA evidence (owner-only)
create table public.sba_private_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  step integer not null check (step between 1 and 6),
  file_path text check (file_path is null or file_path like (user_id::text || '/%')),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index sba_private_evidence_user_idx on public.sba_private_evidence (user_id, created_at);
alter table public.sba_private_evidence enable row level security;
revoke all on public.sba_private_evidence from anon;
grant select, insert, update, delete on public.sba_private_evidence to authenticated;
create policy "sba_private owner select" on public.sba_private_evidence for select to authenticated using ((select auth.uid()) = user_id);
create policy "sba_private owner insert" on public.sba_private_evidence for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "sba_private owner update" on public.sba_private_evidence for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sba_private owner delete" on public.sba_private_evidence for delete to authenticated using ((select auth.uid()) = user_id);

-- Per-user game progress (owner-only). SEN data is never stored here.
create table public.user_progress (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  game jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_progress enable row level security;
revoke all on public.user_progress from anon;
grant select, insert, update, delete on public.user_progress to authenticated;
create policy "user_progress owner select" on public.user_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_progress owner insert" on public.user_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_progress owner update" on public.user_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_progress owner delete" on public.user_progress for delete to authenticated using ((select auth.uid()) = user_id);
create trigger user_progress_updated_at before update on public.user_progress for each row execute function public.set_updated_at();

-- Private bucket: images only, 5 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sba-private', 'sba-private', false, 5242880, array['image/*'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "sba-private owner select" on storage.objects for select to authenticated using (bucket_id = 'sba-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "sba-private owner insert" on storage.objects for insert to authenticated with check (bucket_id = 'sba-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "sba-private owner update" on storage.objects for update to authenticated using (bucket_id = 'sba-private' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'sba-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "sba-private owner delete" on storage.objects for delete to authenticated using (bucket_id = 'sba-private' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Legacy public device-id path: read-only from now on (guests can no longer upload)
drop policy if exists "sba-evidence anon insert" on storage.objects;
drop policy if exists "sba_evidence anon insert" on public.sba_evidence;

-- Applied via Supabase MCP (migration: sba_evidence_storage) on 2026-11-03
create table if not exists public.sba_evidence (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  step int not null check (step between 1 and 6),
  file_path text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists sba_evidence_device_step_idx on public.sba_evidence (device_id, step);
alter table public.sba_evidence enable row level security;
create policy "sba_evidence anon insert" on public.sba_evidence for insert to anon, authenticated with check (true);
create policy "sba_evidence anon select" on public.sba_evidence for select to anon, authenticated using (true);
grant select, insert on public.sba_evidence to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sba-evidence', 'sba-evidence', true, 5242880, array['image/*'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "sba-evidence anon insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'sba-evidence');
create policy "sba-evidence anon select" on storage.objects for select to anon, authenticated using (bucket_id = 'sba-evidence');

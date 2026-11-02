-- Artist portraits and openly licensed artworks for the Art Library.
-- Idempotent. Apply manually in Supabase (JJ). Do not run from the app.
--
-- Read: anon and authenticated may SELECT.
-- Write: no anon or authenticated insert/update/delete (grants revoked, and RLS
-- has no write policy). postgres / service_role keep their existing bypass path
-- so the content team can upsert from the SQL editor.
--
-- Upsert key: UNIQUE (artist_id, kind, sort_order).
-- sort_order is NOT NULL DEFAULT 0 so ON CONFLICT (artist_id, kind, sort_order)
-- matches every row (Postgres unique indexes do not treat NULL as equal).
--
-- status: ok | needs_review | no_legal_image.
-- The app renders an <img> only when status = 'ok' and image_url is a URL.
-- needs_review, no_legal_image, or a null image_url: initials / 「暫無合法圖」.
-- A missing status on a legacy row is treated as ok by the client.

begin;

create table if not exists public.artist_media (
  id uuid primary key default gen_random_uuid(),
  artist_id text not null,
  kind text not null,
  status text not null default 'ok',
  image_url text,
  source_url text,
  license text,
  credit text,
  title_en text,
  title_zh_hant text,
  title_zh_hans text,
  year integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.artist_media add column if not exists artist_id text;
alter table public.artist_media add column if not exists kind text;
alter table public.artist_media add column if not exists status text;
alter table public.artist_media add column if not exists image_url text;
alter table public.artist_media add column if not exists source_url text;
alter table public.artist_media add column if not exists license text;
alter table public.artist_media add column if not exists credit text;
alter table public.artist_media add column if not exists title_en text;
alter table public.artist_media add column if not exists title_zh_hant text;
alter table public.artist_media add column if not exists title_zh_hans text;
alter table public.artist_media add column if not exists year integer;
alter table public.artist_media add column if not exists sort_order integer;
alter table public.artist_media add column if not exists created_at timestamptz;

update public.artist_media set status = 'ok' where status is null;
update public.artist_media set sort_order = 0 where sort_order is null;
update public.artist_media set created_at = now() where created_at is null;

alter table public.artist_media alter column status set default 'ok';
alter table public.artist_media alter column sort_order set default 0;
alter table public.artist_media alter column created_at set default now();
alter table public.artist_media alter column artist_id set not null;
alter table public.artist_media alter column kind set not null;
alter table public.artist_media alter column status set not null;
alter table public.artist_media alter column sort_order set not null;
alter table public.artist_media alter column created_at set not null;

-- PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS. Guard each constraint.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'artist_media_artist_id_fkey'
      and conrelid = 'public.artist_media'::regclass
  ) then
    alter table public.artist_media
      add constraint artist_media_artist_id_fkey
      foreign key (artist_id) references public.artists (artist_id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'artist_media_kind_check'
      and conrelid = 'public.artist_media'::regclass
  ) then
    alter table public.artist_media
      add constraint artist_media_kind_check
      check (kind in ('portrait', 'artwork'));
  end if;
end $$;

-- Replace an older check that only allowed ok | no_legal_image.
do $$
declare
  def text;
begin
  select pg_get_constraintdef(oid) into def
  from pg_constraint
  where conname = 'artist_media_status_check'
    and conrelid = 'public.artist_media'::regclass;

  if def is not null and position('needs_review' in def) = 0 then
    alter table public.artist_media drop constraint artist_media_status_check;
    def := null;
  end if;

  if def is null then
    alter table public.artist_media
      add constraint artist_media_status_check
      check (status in ('ok', 'needs_review', 'no_legal_image'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'artist_media_artist_kind_sort_key'
      and conrelid = 'public.artist_media'::regclass
  ) then
    alter table public.artist_media
      add constraint artist_media_artist_kind_sort_key
      unique (artist_id, kind, sort_order);
  end if;
end $$;

-- The unique index leads with artist_id, so it also covers the foreign key.

alter table public.artist_media enable row level security;

drop policy if exists artist_media_public_read on public.artist_media;
create policy artist_media_public_read
  on public.artist_media
  for select
  to anon, authenticated
  using (true);

revoke all on table public.artist_media from anon, authenticated;
grant select on table public.artist_media to anon, authenticated;

comment on table public.artist_media is
  'Portraits and artworks. Render an image only when status=ok and image_url is set. needs_review and no_legal_image: initials / 暫無合法圖.';
comment on column public.artist_media.kind is 'portrait | artwork';
comment on column public.artist_media.status is 'ok | needs_review | no_legal_image. Only ok may be shown.';
comment on column public.artist_media.sort_order is
  'Upsert key with artist_id and kind. NOT NULL so ON CONFLICT (artist_id, kind, sort_order) is idempotent. Default 0.';

commit;

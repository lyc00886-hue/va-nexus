-- Shared real classrooms. The anon key cannot read the table.
-- public.class_invite_dispatch is the only door, and it does not send invitations.

create schema if not exists class_invite;

revoke all on schema class_invite from public, anon, authenticated;

create table if not exists class_invite.room (
  id text primary key,
  code text not null unique,
  owner_id text not null,
  name text not null,
  members jsonb not null default '[]'::jsonb,
  submissions jsonb not null default '[]'::jsonb,
  assignments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint class_invite_room_code_chk check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  constraint class_invite_room_name_chk check (char_length(name) between 1 and 200)
);

alter table class_invite.room enable row level security;
revoke all on class_invite.room from public, anon, authenticated;

create index if not exists class_invite_room_owner_idx on class_invite.room (owner_id);

create or replace function public.class_invite_dispatch(p_action text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = class_invite, public
as $$
declare
  v_owner text;
  v_name text;
  v_id text;
  v_code text;
  v_member text;
  v_assign text;
  v_file text;
  v_title text;
  v_due text;
  v_notes text;
  v_attach text;
  v_room class_invite.room%rowtype;
  v_count int;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if p_action = 'list' then
    v_owner := btrim(coalesce(p_payload->>'ownerId', ''));
    if v_owner !~ '^[A-Za-z0-9-]{8,80}$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
    return jsonb_build_object(
      'ok', true,
      'rooms', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', room.id,
          'code', room.code,
          'ownerId', room.owner_id,
          'name', room.name,
          'members', room.members,
          'submissions', room.submissions,
          'assignments', room.assignments
        ) order by room.created_at)
        from class_invite.room room
        where room.owner_id = v_owner
      ), '[]'::jsonb)
    );
  end if;

  if p_action = 'get' then
    v_code := upper(btrim(coalesce(p_payload->>'code', '')));
    v_member := btrim(coalesce(p_payload->>'memberId', ''));
    if v_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
      select * into v_room from class_invite.room where code = v_code;
      if not found then
        return jsonb_build_object('ok', false, 'reason', 'missing');
      end if;
      if v_member !~ '^[A-Za-z0-9-]{8,80}$' then
        v_member := '';
      end if;
      return jsonb_build_object(
        'ok', true,
        'room', jsonb_build_object(
          'id', v_room.id,
          'code', v_room.code,
          'ownerId', '',
          'name', v_room.name,
          'members', coalesce((
            select jsonb_agg(elem) from jsonb_array_elements(v_room.members) elem
            where elem->>'id' = v_member
          ), '[]'::jsonb),
          'submissions', coalesce((
            select jsonb_agg(elem) from jsonb_array_elements(v_room.submissions) elem
            where elem->>'memberId' = v_member
          ), '[]'::jsonb),
          'assignments', v_room.assignments
        )
      );
    end if;
    v_id := btrim(coalesce(p_payload->>'id', ''));
    v_owner := btrim(coalesce(p_payload->>'ownerId', ''));
    if v_id !~ '^[A-Za-z0-9-]{8,80}$' or v_owner !~ '^[A-Za-z0-9-]{8,80}$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
    select * into v_room from class_invite.room where id = v_id and owner_id = v_owner;
    if not found then
      return jsonb_build_object('ok', false, 'reason', 'missing');
    end if;
    return jsonb_build_object(
      'ok', true,
      'room', jsonb_build_object(
        'id', v_room.id,
        'code', v_room.code,
        'ownerId', v_room.owner_id,
        'name', v_room.name,
        'members', v_room.members,
        'submissions', v_room.submissions,
        'assignments', v_room.assignments
      )
    );
  end if;

  if p_action = 'create' then
    v_owner := btrim(coalesce(p_payload->>'ownerId', ''));
    v_name := btrim(regexp_replace(left(coalesce(p_payload->>'name', ''), 200), '[[:cntrl:]]', '', 'g'));
    v_id := btrim(coalesce(p_payload->>'id', ''));
    v_code := upper(btrim(coalesce(p_payload->>'code', '')));
    if v_owner !~ '^[A-Za-z0-9-]{8,80}$'
      or v_id !~ '^[A-Za-z0-9-]{8,80}$'
      or v_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'
      or char_length(v_name) < 1 then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
    select * into v_room from class_invite.room where owner_id = v_owner and name = v_name;
    if found then
      return jsonb_build_object(
        'ok', true,
        'room', jsonb_build_object(
          'id', v_room.id,
          'code', v_room.code,
          'ownerId', v_room.owner_id,
          'name', v_room.name,
          'members', v_room.members,
          'submissions', v_room.submissions,
          'assignments', v_room.assignments
        )
      );
    end if;
    if (select count(*) from class_invite.room) >= 5000 then
      return jsonb_build_object('ok', false, 'reason', 'full');
    end if;
    if (select count(*) from class_invite.room where owner_id = v_owner) >= 20 then
      return jsonb_build_object('ok', false, 'reason', 'full');
    end if;
    if exists (select 1 from class_invite.room where id = v_id or code = v_code) then
      return jsonb_build_object('ok', false, 'reason', 'conflict');
    end if;
    insert into class_invite.room (id, code, owner_id, name, members, submissions, assignments)
    values (v_id, v_code, v_owner, v_name, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
    returning * into v_room;
    return jsonb_build_object(
      'ok', true,
      'room', jsonb_build_object(
        'id', v_room.id,
        'code', v_room.code,
        'ownerId', v_room.owner_id,
        'name', v_room.name,
        'members', v_room.members,
        'submissions', v_room.submissions,
        'assignments', v_room.assignments
      )
    );
  end if;

  if p_action = 'join' then
    v_code := upper(btrim(coalesce(p_payload->>'code', '')));
    v_member := btrim(coalesce(p_payload->>'memberId', ''));
    if v_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' or v_member !~ '^[A-Za-z0-9-]{8,80}$' then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
    select * into v_room from class_invite.room where code = v_code for update;
    if not found then
      return jsonb_build_object('ok', false, 'reason', 'missing');
    end if;
    if not exists (
      select 1 from jsonb_array_elements(v_room.members) elem where elem->>'id' = v_member
    ) then
      select count(*) into v_count from jsonb_array_elements(v_room.members);
      if v_count >= 60 then
        return jsonb_build_object('ok', false, 'reason', 'full');
      end if;
      update class_invite.room
      set members = members || jsonb_build_array(jsonb_build_object('id', v_member))
      where id = v_room.id
      returning * into v_room;
    end if;
    return jsonb_build_object(
      'ok', true,
      'room', jsonb_build_object(
        'id', v_room.id,
        'code', v_room.code,
        'ownerId', '',
        'name', v_room.name,
        'members', jsonb_build_array(jsonb_build_object('id', v_member)),
        'submissions', coalesce((
          select jsonb_agg(elem) from jsonb_array_elements(v_room.submissions) elem
          where elem->>'memberId' = v_member
        ), '[]'::jsonb),
        'assignments', v_room.assignments
      )
    );
  end if;

  if p_action = 'submit' then
    v_code := upper(btrim(coalesce(p_payload->>'code', '')));
    v_member := btrim(coalesce(p_payload->>'memberId', ''));
    v_assign := btrim(left(coalesce(p_payload->>'assignmentId', ''), 80));
    v_file := btrim(regexp_replace(left(coalesce(p_payload->>'fileName', ''), 200), '[[:cntrl:]]', '', 'g'));
    if v_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'
      or v_member !~ '^[A-Za-z0-9-]{8,80}$'
      or char_length(v_assign) < 1
      or char_length(v_file) < 1 then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
    select * into v_room from class_invite.room where code = v_code for update;
    if not found then
      return jsonb_build_object('ok', false, 'reason', 'missing');
    end if;
    if not exists (
      select 1 from jsonb_array_elements(v_room.members) elem where elem->>'id' = v_member
    ) then
      return jsonb_build_object('ok', false, 'reason', 'missing');
    end if;
    update class_invite.room
    set submissions = (
      select coalesce(jsonb_agg(elem), '[]'::jsonb)
      from (
        select elem from jsonb_array_elements(v_room.submissions) elem
        where not (coalesce(elem->>'memberId', '') = v_member and coalesce(elem->>'assignmentId', '') = v_assign)
        union all
        select jsonb_build_object('memberId', v_member, 'assignmentId', v_assign, 'fileName', v_file) as elem
      ) kept
    )
    where id = v_room.id
    returning * into v_room;
    return jsonb_build_object(
      'ok', true,
      'room', jsonb_build_object(
        'id', v_room.id,
        'code', v_room.code,
        'ownerId', '',
        'name', v_room.name,
        'members', jsonb_build_array(jsonb_build_object('id', v_member)),
        'submissions', coalesce((
          select jsonb_agg(elem) from jsonb_array_elements(v_room.submissions) elem
          where elem->>'memberId' = v_member
        ), '[]'::jsonb),
        'assignments', v_room.assignments
      )
    );
  end if;

  if p_action = 'publish' then
    v_owner := btrim(coalesce(p_payload->>'ownerId', ''));
    v_id := btrim(coalesce(p_payload->>'id', ''));
    v_assign := btrim(coalesce(p_payload->>'assignmentId', ''));
    v_title := btrim(regexp_replace(left(coalesce(p_payload->>'title', ''), 200), '[[:cntrl:]]', '', 'g'));
    v_due := btrim(regexp_replace(left(coalesce(p_payload->>'due', ''), 200), '[[:cntrl:]]', '', 'g'));
    v_notes := btrim(regexp_replace(left(coalesce(p_payload->>'instructions', ''), 200), '[[:cntrl:]]', '', 'g'));
    v_attach := coalesce(p_payload->>'attach', '');
    if v_owner !~ '^[A-Za-z0-9-]{8,80}$'
      or v_id !~ '^[A-Za-z0-9-]{8,80}$'
      or v_assign !~ '^[A-Za-z0-9-]{8,80}$'
      or char_length(v_title) < 1
      or char_length(v_due) < 1
      or v_attach not in ('none', 'paper') then
      return jsonb_build_object('ok', false, 'reason', 'invalid');
    end if;
    select * into v_room from class_invite.room where id = v_id and owner_id = v_owner for update;
    if not found then
      return jsonb_build_object('ok', false, 'reason', 'missing');
    end if;
    if not exists (
      select 1 from jsonb_array_elements(v_room.assignments) elem where elem->>'id' = v_assign
    ) then
      select count(*) into v_count from jsonb_array_elements(v_room.assignments);
      if v_count >= 30 then
        return jsonb_build_object('ok', false, 'reason', 'full');
      end if;
      update class_invite.room
      set assignments = assignments || jsonb_build_array(jsonb_build_object(
        'id', v_assign,
        'title', v_title,
        'due', v_due,
        'instructions', v_notes,
        'attach', v_attach,
        'demo', false
      ))
      where id = v_room.id
      returning * into v_room;
    end if;
    return jsonb_build_object(
      'ok', true,
      'room', jsonb_build_object(
        'id', v_room.id,
        'code', v_room.code,
        'ownerId', v_room.owner_id,
        'name', v_room.name,
        'members', v_room.members,
        'submissions', v_room.submissions,
        'assignments', v_room.assignments
      )
    );
  end if;

  return jsonb_build_object('ok', false, 'reason', 'action');
end;
$$;

revoke all on function public.class_invite_dispatch(text, jsonb) from public;
grant execute on function public.class_invite_dispatch(text, jsonb) to anon, authenticated, service_role;

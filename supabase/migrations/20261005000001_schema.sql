-- Study Tracker — esquema, RLS y reglas de progreso.
-- Ejecutar una vez en el SQL editor de Supabase (o con `supabase db push`).
-- Requiere los roles/esquema estándar de Supabase: anon, authenticated, service_role, auth.users, auth.uid().

------------------------------------------------------------------------------
-- 1. Tablas de contenido (curriculum)
------------------------------------------------------------------------------

create table public.blocks (
  id                 smallint primary key check (id > 0),
  title              text     not null,
  goal               text     not null,
  certification      text,
  certification_code text,
  certification_day  smallint,
  total_days         smallint not null check (total_days > 0),
  constraint blocks_cert_day_in_range
    check (certification_day is null or certification_day between 1 and total_days)
);

create table public.sessions (
  id          integer  primary key,
  position    integer  not null unique check (position > 0),  -- orden global 1..N (secuencia estricta)
  block_id    smallint not null references public.blocks (id) on delete restrict,
  day         smallint not null check (day > 0),
  hours       smallint not null check (hours in (2, 3)),
  title       text     not null,
  description text     not null default '',
  links       jsonb    not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  constraint sessions_block_day_unique unique (block_id, day)
);

create index sessions_block_id_idx on public.sessions (block_id);

------------------------------------------------------------------------------
-- 2. Progreso (una fila = sesión completada por un usuario)
------------------------------------------------------------------------------

create table public.progress (
  user_id      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  session_id   integer     not null references public.sessions (id) on delete restrict,
  completed_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

create index progress_session_id_idx on public.progress (session_id);

------------------------------------------------------------------------------
-- 3. Privilegios: nada para anon; authenticated solo lo mínimo.
--    (Supabase concede ALL — incluido TRUNCATE, que ignora RLS — por defecto.)
------------------------------------------------------------------------------

revoke all on table public.blocks, public.sessions, public.progress from anon, authenticated;
grant select on table public.blocks, public.sessions to authenticated;
grant select, insert, delete on table public.progress to authenticated;

------------------------------------------------------------------------------
-- 4. Row Level Security
------------------------------------------------------------------------------

alter table public.blocks   enable row level security;
alter table public.sessions enable row level security;
alter table public.progress enable row level security;

create policy blocks_select_authenticated on public.blocks
  for select to authenticated using (true);

create policy sessions_select_authenticated on public.sessions
  for select to authenticated using (true);

create policy progress_select_own on public.progress
  for select to authenticated using (user_id = (select auth.uid()));

create policy progress_insert_own on public.progress
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy progress_delete_own on public.progress
  for delete to authenticated using (user_id = (select auth.uid()));

-- Sin política de UPDATE: el progreso es inmutable (se marca o se deshace).

------------------------------------------------------------------------------
-- 5. Reglas de secuencia (autoridad final, a nivel de fila)
--    - INSERT: solo la sesión `current` (primera sin completar, por position).
--    - DELETE: solo la última completada (undo de un paso).
--    - UPDATE: prohibido.
--    Se aplican a los roles de la API (anon/authenticated/service_role), así que
--    valen tanto para las RPC como para escrituras directas vía PostgREST.
--    Roles de administración (SQL editor, cascadas de FK al borrar un usuario) no
--    se restringen.
------------------------------------------------------------------------------

create or replace function public.enforce_progress_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_user     uuid;
  v_expected integer;
  v_last     integer;
begin
  if current_user not in ('anon', 'authenticated', 'service_role') then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    raise exception 'progress_is_immutable' using errcode = 'P0001';
  end if;

  v_user := case when tg_op = 'DELETE' then old.user_id else new.user_id end;

  -- Serializa escrituras concurrentes del mismo usuario (doble tap, dos pestañas).
  perform pg_advisory_xact_lock(hashtextextended('study-tracker:progress:' || v_user::text, 0));

  if tg_op = 'INSERT' then
    select s.id
      into v_expected
      from public.sessions s
     where not exists (
             select 1 from public.progress p
              where p.user_id = v_user and p.session_id = s.id)
     order by s.position
     limit 1;

    if v_expected is null then
      raise exception 'route_complete' using errcode = 'P0001';
    end if;
    if new.session_id is distinct from v_expected then
      raise exception 'not_current_session' using errcode = 'P0001';
    end if;

    new.completed_at := now();  -- el cliente no decide la fecha
    return new;
  end if;

  -- DELETE
  select p.session_id
    into v_last
    from public.progress p
    join public.sessions s on s.id = p.session_id
   where p.user_id = v_user
   order by s.position desc
   limit 1;

  if old.session_id is distinct from v_last then
    raise exception 'not_last_session' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

revoke all on function public.enforce_progress_rules() from public, anon, authenticated;

create trigger progress_enforce_rules
  before insert or update or delete on public.progress
  for each row execute function public.enforce_progress_rules();

------------------------------------------------------------------------------
-- 6. RPC usadas por la app (SECURITY INVOKER: corren con la sesión del usuario y RLS)
------------------------------------------------------------------------------

-- Marca como hecha la sesión indicada si (y solo si) es la `current` del usuario.
-- Devuelve {"completed": <id>, "next": <id|null>}.
create or replace function public.complete_next_session(p_session_id integer)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_next integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_session_id is null then
    raise exception 'not_current_session' using errcode = 'P0001';
  end if;

  -- El trigger valida la regla "no saltar" de forma atómica.
  insert into public.progress (user_id, session_id) values (v_uid, p_session_id);

  select s.id
    into v_next
    from public.sessions s
   where not exists (
           select 1 from public.progress p
            where p.user_id = v_uid and p.session_id = s.id)
   order by s.position
   limit 1;

  return jsonb_build_object('completed', p_session_id, 'next', v_next);
end;
$$;

-- Deshace la última sesión completada. Si se pasa p_session_id, debe coincidir con
-- la última (evita deshacer otra cosa desde una pestaña desactualizada).
-- Devuelve {"undone": <id>}.
create or replace function public.undo_last_session(p_session_id integer default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_last integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('study-tracker:progress:' || v_uid::text, 0));

  select p.session_id
    into v_last
    from public.progress p
    join public.sessions s on s.id = p.session_id
   where p.user_id = v_uid
   order by s.position desc
   limit 1;

  if v_last is null then
    raise exception 'nothing_to_undo' using errcode = 'P0001';
  end if;
  if p_session_id is not null and p_session_id <> v_last then
    raise exception 'not_last_session' using errcode = 'P0001';
  end if;

  delete from public.progress where user_id = v_uid and session_id = v_last;

  return jsonb_build_object('undone', v_last);
end;
$$;

revoke all on function public.complete_next_session(integer) from public, anon;
revoke all on function public.undo_last_session(integer) from public, anon;
grant execute on function public.complete_next_session(integer) to authenticated;
grant execute on function public.undo_last_session(integer) to authenticated;

------------------------------------------------------------------------------
-- 7. Keepalive (cron semanal): consulta trivial, no lee ni escribe datos.
------------------------------------------------------------------------------

create or replace function public.keepalive()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select true $$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;

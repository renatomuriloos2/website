-- Rethink Portal de Clientes — esquema de base de datos
-- Ejecutar en el SQL editor de Supabase (proyecto nuevo) en una sola pasada.

create extension if not exists "pgcrypto";

-- ============================================================
-- TABLAS
-- ============================================================

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  active_systems text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists parameter_ranges (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  system text not null check (system in ('Calderas', 'Enfriamiento', 'Vapor', 'PTAR')),
  param_key text not null,
  label text not null,
  unit text,
  min_value numeric,
  max_value numeric,
  updated_at timestamptz not null default now(),
  unique (client_id, system, param_key)
);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  system text not null check (system in ('Calderas', 'Enfriamiento', 'Vapor', 'PTAR')),
  visit_date date not null default current_date,
  technician text,
  recommendation text,
  priority text not null default 'normal' check (priority in ('normal', 'atencion', 'urgente')),
  next_visit_date date,
  created_at timestamptz not null default now()
);

create table if not exists visit_readings (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits(id) on delete cascade,
  param_key text not null,
  value numeric not null
);

create table if not exists visit_dosing (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits(id) on delete cascade,
  product text not null,
  dose numeric,
  unit text,
  notes text
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'tecnico', 'client')),
  -- Legacy single-client link, superseded by user_clients below. Kept only so
  -- old rows don't break; the app no longer reads or writes it.
  client_id uuid references clients(id) on delete set null
);

-- Un usuario "cliente" puede tener acceso a varios clientes (ej. un contacto
-- que administra San Juan Textiles y Elcatex a la vez).
create table if not exists user_clients (
  user_id uuid not null references users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  primary key (user_id, client_id)
);

create index if not exists idx_parameter_ranges_client on parameter_ranges(client_id);
create index if not exists idx_visits_client on visits(client_id);
create index if not exists idx_visit_readings_visit on visit_readings(visit_id);
create index if not exists idx_visit_dosing_visit on visit_dosing(visit_id);
create index if not exists idx_user_clients_client on user_clients(client_id);

-- ============================================================
-- FUNCIONES AUXILIARES (SECURITY DEFINER para evitar recursion en RLS)
-- ============================================================

create or replace function auth_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from users where id = auth.uid();
$$;

create or replace function auth_client_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select client_id from users where id = auth.uid();
$$;

-- true si el usuario autenticado (rol 'client') tiene acceso al cliente cid,
-- vía user_clients (un usuario puede estar vinculado a varios clientes).
create or replace function is_client_of(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from user_clients uc where uc.user_id = auth.uid() and uc.client_id = cid
  );
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(auth_role() = 'admin', false);
$$;

-- "staff" = admin o técnico: ambos pueden operar clientes, rangos y
-- visitas. Solo is_admin() (arriba) puede gestionar cuentas de usuario
-- — ver las políticas de la tabla `users` más abajo, que siguen usando
-- is_admin() a propósito.
create or replace function is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(auth_role() in ('admin', 'tecnico'), false);
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table clients enable row level security;
alter table parameter_ranges enable row level security;
alter table visits enable row level security;
alter table visit_readings enable row level security;
alter table visit_dosing enable row level security;
alter table users enable row level security;
alter table user_clients enable row level security;

-- users: cada quien lee su propia fila; admin lee y administra todas
drop policy if exists "users select own or admin" on users;
create policy "users select own or admin" on users
  for select using (id = auth.uid() or is_admin());

drop policy if exists "users admin write" on users;
create policy "users admin write" on users
  for all using (is_admin()) with check (is_admin());

-- user_clients: cada quien lee sus propios vínculos; solo staff los administra
drop policy if exists "user_clients select own or staff" on user_clients;
create policy "user_clients select own or staff" on user_clients
  for select using (user_id = auth.uid() or is_staff());

drop policy if exists "user_clients staff write" on user_clients;
create policy "user_clients staff write" on user_clients
  for all using (is_staff()) with check (is_staff());

-- clients: admin/técnico acceso completo; cliente solo lee los clientes a los que está vinculado
drop policy if exists "clients select" on clients;
create policy "clients select" on clients
  for select using (is_staff() or is_client_of(id));

drop policy if exists "clients admin write" on clients;
create policy "clients admin write" on clients
  for insert with check (is_staff());

drop policy if exists "clients admin update" on clients;
create policy "clients admin update" on clients
  for update using (is_staff()) with check (is_staff());

drop policy if exists "clients admin delete" on clients;
create policy "clients admin delete" on clients
  for delete using (is_staff());

-- parameter_ranges: admin/técnico acceso completo; cliente solo lee lo suyo
drop policy if exists "ranges select" on parameter_ranges;
create policy "ranges select" on parameter_ranges
  for select using (is_staff() or is_client_of(client_id));

drop policy if exists "ranges admin insert" on parameter_ranges;
create policy "ranges admin insert" on parameter_ranges
  for insert with check (is_staff());

drop policy if exists "ranges admin update" on parameter_ranges;
create policy "ranges admin update" on parameter_ranges
  for update using (is_staff()) with check (is_staff());

drop policy if exists "ranges admin delete" on parameter_ranges;
create policy "ranges admin delete" on parameter_ranges
  for delete using (is_staff());

-- visits: admin/técnico acceso completo; cliente solo lee lo suyo
drop policy if exists "visits select" on visits;
create policy "visits select" on visits
  for select using (is_staff() or is_client_of(client_id));

drop policy if exists "visits admin insert" on visits;
create policy "visits admin insert" on visits
  for insert with check (is_staff());

drop policy if exists "visits admin update" on visits;
create policy "visits admin update" on visits
  for update using (is_staff()) with check (is_staff());

drop policy if exists "visits admin delete" on visits;
create policy "visits admin delete" on visits
  for delete using (is_staff());

-- visit_readings: heredan el alcance de la visita
drop policy if exists "readings select" on visit_readings;
create policy "readings select" on visit_readings
  for select using (
    is_staff() or exists (
      select 1 from visits v where v.id = visit_readings.visit_id and is_client_of(v.client_id)
    )
  );

drop policy if exists "readings admin insert" on visit_readings;
create policy "readings admin insert" on visit_readings
  for insert with check (is_staff());

drop policy if exists "readings admin update" on visit_readings;
create policy "readings admin update" on visit_readings
  for update using (is_staff()) with check (is_staff());

drop policy if exists "readings admin delete" on visit_readings;
create policy "readings admin delete" on visit_readings
  for delete using (is_staff());

-- visit_dosing: heredan el alcance de la visita
drop policy if exists "dosing select" on visit_dosing;
create policy "dosing select" on visit_dosing
  for select using (
    is_staff() or exists (
      select 1 from visits v where v.id = visit_dosing.visit_id and is_client_of(v.client_id)
    )
  );

drop policy if exists "dosing admin insert" on visit_dosing;
create policy "dosing admin insert" on visit_dosing
  for insert with check (is_staff());

drop policy if exists "dosing admin update" on visit_dosing;
create policy "dosing admin update" on visit_dosing
  for update using (is_staff()) with check (is_staff());

drop policy if exists "dosing admin delete" on visit_dosing;
create policy "dosing admin delete" on visit_dosing
  for delete using (is_staff());

-- ============================================================
-- CATÁLOGO DE PARÁMETROS POR DEFECTO (referencia, no una tabla)
-- Se usa desde el código (lib/constants.ts) para poblar rangos
-- por defecto al crear un cliente nuevo. Ver esa constante para
-- los mismos param_key/label/unit descritos en el brief.
-- ============================================================

-- ============================================================
-- MIGRACIÓN (si ya corriste este schema.sql antes de que existiera
-- la columna active_systems, ejecuta esto una sola vez; en un
-- proyecto nuevo no hace falta, ya está en el create table de arriba)
-- ============================================================
-- alter table clients add column if not exists active_systems text[] not null default '{}';
-- update clients set active_systems = array['Calderas','Enfriamiento','Vapor','PTAR']
--   where active_systems = '{}';
-- ============================================================

-- ============================================================
-- MIGRACIÓN: rol "tecnico" (si ya corriste este schema.sql antes de
-- que existiera este rol, ejecuta esto una sola vez; en un proyecto
-- nuevo no hace falta, ya está arriba en el create table y las
-- funciones/políticas de más arriba)
-- ============================================================
-- alter table users drop constraint if exists users_role_check;
-- alter table users add constraint users_role_check
--   check (role in ('admin', 'tecnico', 'client'));
--
-- create or replace function is_staff()
-- returns boolean language sql security definer stable set search_path = public
-- as $$ select coalesce(auth_role() in ('admin', 'tecnico'), false); $$;
--
-- Luego vuelve a correr, desde este mismo archivo, todo el bloque
-- "ROW LEVEL SECURITY" de clients / parameter_ranges / visits /
-- visit_readings / visit_dosing (cada policy hace "drop ... if exists"
-- antes de "create", así que repetirlas es seguro) para que queden
-- usando is_staff() en vez de is_admin().
-- ============================================================

-- ============================================================
-- MIGRACIÓN: un usuario cliente con acceso a varios clientes
-- (si ya corriste este schema.sql antes de que existiera la tabla
-- user_clients, ejecuta esto una sola vez; en un proyecto nuevo no
-- hace falta, ya está arriba en el create table y las funciones/
-- políticas de más arriba)
-- ============================================================
-- create table if not exists user_clients (
--   user_id uuid not null references users(id) on delete cascade,
--   client_id uuid not null references clients(id) on delete cascade,
--   primary key (user_id, client_id)
-- );
-- create index if not exists idx_user_clients_client on user_clients(client_id);
--
-- -- Migra los vínculos existentes de users.client_id a la tabla nueva:
-- insert into user_clients (user_id, client_id)
-- select id, client_id from users where client_id is not null
-- on conflict do nothing;
--
-- create or replace function is_client_of(cid uuid)
-- returns boolean language sql security definer stable set search_path = public
-- as $$
--   select exists (
--     select 1 from user_clients uc where uc.user_id = auth.uid() and uc.client_id = cid
--   );
-- $$;
--
-- alter table user_clients enable row level security;
--
-- drop policy if exists "user_clients select own or staff" on user_clients;
-- create policy "user_clients select own or staff" on user_clients
--   for select using (user_id = auth.uid() or is_staff());
--
-- drop policy if exists "user_clients staff write" on user_clients;
-- create policy "user_clients staff write" on user_clients
--   for all using (is_staff()) with check (is_staff());
--
-- Luego vuelve a correr, desde este mismo archivo, todo el bloque
-- "ROW LEVEL SECURITY" de clients / parameter_ranges / visits /
-- visit_readings / visit_dosing (cada policy hace "drop ... if exists"
-- antes de "create", así que repetirlas es seguro) para que queden
-- usando is_client_of(...) en vez de auth_client_id().
-- ============================================================

-- ============================================================
-- PRIMER USUARIO ADMIN
-- Después de crear el usuario en Authentication > Users (Supabase),
-- copia su UUID y corre:
--
-- insert into users (id, email, role) values ('UUID-DEL-USUARIO', 'admin@rethink.com', 'admin');
--
-- Para un cliente de prueba, primero crea el cliente:
-- insert into clients (name, location) values ('Cliente de prueba', 'Bogotá') returning id;
-- Luego crea su usuario en Authentication > Users y vincúlalo:
-- insert into users (id, email, role) values ('UUID-DEL-USUARIO', 'cliente@ejemplo.com', 'client');
-- insert into user_clients (user_id, client_id) values ('UUID-DEL-USUARIO', 'UUID-DEL-CLIENTE');
-- ============================================================

-- ════════════════════════════════════════════════════════════════════════════
-- Fanatics Decoration Quality Lab — database schema (PostgreSQL / Supabase)
--
-- Run once in Supabase → SQL Editor on a NEW project, then run seed.sql.
-- Security model:
--   • Every table has Row Level Security enabled.
--   • Supplier users see and write ONLY rows of their own supplier.
--   • Decisions / status changes are staff-only (admin, reviewer).
--   • supplier_id on child tables is derived by triggers — never trusted from the client.
--   • audit_log is append-only and hash-chained (tamper-evident).
--   • Files live in PRIVATE storage buckets, folder = supplier_id, served via short-lived signed URLs.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ─── Reference / protocol tables ────────────────────────────────────────────

create table if not exists public.test_methods (
  id          text primary key,
  code        text not null,
  standards   text not null,
  name_en     text not null,
  name_es     text not null,
  category    text not null check (category in ('colorfastness','migration','decoration','physical','chemical','shade')),
  kind        text not null check (kind in ('grade','ladder','numeric')),
  is_base     boolean not null default false,
  is_critical boolean not null default false
);

create table if not exists public.decoration_methods (
  code           text primary key,
  name_en        text not null,
  name_es        text not null,
  family         text not null,
  process_temp_c int,
  low_temp_c     int,
  dwell_s        int
);

create table if not exists public.decoration_method_tests (
  decoration_code text not null references public.decoration_methods(code) on delete cascade,
  test_id         text not null references public.test_methods(id) on delete cascade,
  critical        boolean not null default false,
  primary key (decoration_code, test_id)
);

create table if not exists public.requirements (
  fiber       text not null check (fiber in ('polyester','recycled_polyester','cationic_polyester','poly_spandex','nylon','polycotton','triblend','cotton')),
  test_id     text not null references public.test_methods(id) on delete cascade,
  reading_key text not null,
  min_value   numeric,
  max_value   numeric,
  use_abs     boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  primary key (fiber, test_id, reading_key)
);

-- ─── Core tables ────────────────────────────────────────────────────────────

create table if not exists public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 120),
  code          text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  country       text not null default '',
  city          text not null default '',
  contact_name  text not null default '',
  contact_email text not null default '',
  phone         text not null default '',
  logo_path     text,
  status        text not null default 'active' check (status in ('active','onboarding','inactive')),
  tier          text not null default 'approved' check (tier in ('strategic','approved','probation')),
  is_sample     boolean not null default false,  -- rows created by "Load sample data"
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null unique,
  full_name            text not null default '',
  role                 text not null check (role in ('admin','reviewer','supplier')),
  supplier_id          uuid references public.suppliers(id) on delete restrict,
  active               boolean not null default true,
  must_change_password boolean not null default true,
  created_at           timestamptz not null default now(),
  constraint supplier_link check ((role = 'supplier') = (supplier_id is not null))
);

create table if not exists public.fabrics (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references public.suppliers(id) on delete restrict,
  code         text not null check (char_length(code) between 1 and 40),
  name         text not null check (char_length(name) between 1 and 120),
  fiber        text not null check (fiber in ('polyester','recycled_polyester','cationic_polyester','poly_spandex','nylon','polycotton','triblend','cotton')),
  composition  text not null default '',
  construction text not null default '',
  weight_gsm   int check (weight_gsm is null or weight_gsm between 40 and 1000),
  color        text not null default '',
  color_hex    text not null default '#888888' check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  dye_class    text not null default '',
  finish       text not null default '',
  photo_path   text,
  notes        text not null default '',
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (supplier_id, code)
);

create sequence if not exists public.lot_ref_seq start 101;

create table if not exists public.lots (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null unique default ('QC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.lot_ref_seq')::text, 4, '0')),
  supplier_id    uuid not null references public.suppliers(id) on delete restrict,
  fabric_id      uuid not null references public.fabrics(id) on delete restrict,
  lot_number     text not null check (char_length(lot_number) between 1 and 60),
  po_number      text not null default '',
  program        text not null default '',
  garment_type   text not null default 'jersey' check (garment_type in ('jersey','tee','hoodie','polo','shorts')),
  quantity_m     numeric check (quantity_m is null or quantity_m >= 0),
  methods        text[] not null default '{}',
  -- colorways tested: [{id, name, hex, code}]
  colors         jsonb not null default '[]'::jsonb check (jsonb_typeof(colors) = 'array'),
  status         text not null default 'submitted' check (status in ('draft','submitted','in_review','retest','on_hold','approved','approved_concession','rejected')),
  is_retest      boolean not null default false,
  parent_lot_id  uuid references public.lots(id) on delete set null,
  lab_name       text not null default '',
  submitted_at   timestamptz default now(),
  decided_at     timestamptz,
  decided_by     text,
  decision_notes text not null default '',
  overrides      jsonb not null default '{}'::jsonb,
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.test_results (
  id          uuid primary key default gen_random_uuid(),
  lot_id      uuid not null references public.lots(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  test_id     text not null references public.test_methods(id),
  color_id    text,  -- lots.colors[].id; null = applies to every color
  readings    jsonb not null default '{}'::jsonb check (jsonb_typeof(readings) = 'object'),
  assessment  text not null default 'gray_scale' check (assessment in ('gray_scale','spectrophotometer','visual','instrument')),
  delta_e     jsonb not null default '{}'::jsonb,
  lab_name    text not null default '',
  tested_at   date not null default current_date,
  notes       text not null default '',
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

create table if not exists public.evidence (
  id               uuid primary key default gen_random_uuid(),
  lot_id           uuid not null references public.lots(id) on delete cascade,
  supplier_id      uuid not null references public.suppliers(id),
  result_id        uuid references public.test_results(id) on delete set null,
  kind             text not null default 'photo' check (kind in ('photo','report','spectro','other')),
  name             text not null,
  mime             text not null,
  size_bytes       bigint not null check (size_bytes between 1 and 10485760),
  sha256           text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path     text not null unique,
  uploaded_by      uuid default auth.uid(),
  uploaded_by_name text not null default '',
  created_at       timestamptz not null default now()
);

create table if not exists public.lot_events (
  id          uuid primary key default gen_random_uuid(),
  lot_id      uuid not null references public.lots(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  at          timestamptz not null default now(),
  actor_id    uuid default auth.uid(),
  actor_name  text not null default '',
  type        text not null check (type in ('created','submitted','status','result','evidence','decision','comment')),
  from_status text,
  to_status   text,
  message     text not null default ''
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text not null default '',
  href       text not null default '/',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  prefix       text not null,
  key_hash     text not null unique,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create table if not exists public.audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  actor_email text,
  action      text not null,
  entity      text not null,
  entity_id   text not null,
  details     jsonb not null default '{}'::jsonb,
  prev_hash   text,
  row_hash    text
);

create index if not exists idx_fabrics_supplier on public.fabrics(supplier_id);
create index if not exists idx_lots_supplier on public.lots(supplier_id);
create index if not exists idx_lots_fabric on public.lots(fabric_id);
create index if not exists idx_lots_status on public.lots(status);
create index if not exists idx_results_lot on public.test_results(lot_id);
create index if not exists idx_evidence_lot on public.evidence(lot_id);
create index if not exists idx_events_lot on public.lot_events(lot_id);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_audit_at on public.audit_log(at desc);
create index if not exists idx_profiles_supplier on public.profiles(supplier_id);

-- ─── Helper functions (SECURITY DEFINER avoids RLS recursion) ──────────────

create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('admin','reviewer'), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'admin', false)
$$;

create or replace function public.my_supplier_id()
returns uuid language sql stable security definer set search_path = public as $$
  select supplier_id from public.profiles where id = auth.uid() and active and role = 'supplier'
$$;

create or replace function public.can_see_supplier(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or (sid is not null and sid = public.my_supplier_id())
$$;

-- The user clears their own "must change password" flag after changing it.
create or replace function public.clear_must_change_password()
returns void language sql security definer set search_path = public as $$
  update public.profiles set must_change_password = false where id = auth.uid()
$$;

-- ─── Integrity triggers ─────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_suppliers_touch on public.suppliers;
create trigger trg_suppliers_touch before update on public.suppliers for each row execute function public.touch_updated_at();
drop trigger if exists trg_fabrics_touch on public.fabrics;
create trigger trg_fabrics_touch before update on public.fabrics for each row execute function public.touch_updated_at();
drop trigger if exists trg_lots_touch on public.lots;
create trigger trg_lots_touch before update on public.lots for each row execute function public.touch_updated_at();

-- Lots: supplier_id comes from the fabric; suppliers cannot pre-set decisions.
create or replace function public.lots_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select supplier_id into new.supplier_id from public.fabrics where id = new.fabric_id;
  if new.supplier_id is null then raise exception 'fabric not found'; end if;
  if not public.is_staff() and auth.uid() is not null then
    new.status := 'submitted';
    new.decided_at := null;
    new.decided_by := null;
    new.decision_notes := '';
    new.overrides := '{}'::jsonb;
    new.created_by := auth.uid();
  end if;
  new.is_retest := new.is_retest or new.parent_lot_id is not null;
  return new;
end $$;
drop trigger if exists trg_lots_before_insert on public.lots;
create trigger trg_lots_before_insert before insert on public.lots for each row execute function public.lots_before_insert();

-- Child rows inherit supplier_id from their lot.
create or replace function public.inherit_lot_supplier()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select supplier_id into new.supplier_id from public.lots where id = new.lot_id;
  if new.supplier_id is null then raise exception 'lot not found'; end if;
  return new;
end $$;
drop trigger if exists trg_results_supplier on public.test_results;
create trigger trg_results_supplier before insert on public.test_results for each row execute function public.inherit_lot_supplier();
drop trigger if exists trg_evidence_supplier on public.evidence;
create trigger trg_evidence_supplier before insert on public.evidence for each row execute function public.inherit_lot_supplier();
drop trigger if exists trg_events_supplier on public.lot_events;
create trigger trg_events_supplier before insert on public.lot_events for each row execute function public.inherit_lot_supplier();

-- Evidence must live inside the supplier's own storage folder.
create or replace function public.evidence_path_guard()
returns trigger language plpgsql as $$
begin
  if split_part(new.storage_path, '/', 1) <> new.supplier_id::text then
    raise exception 'evidence path must start with the supplier id';
  end if;
  return new;
end $$;
drop trigger if exists trg_evidence_path on public.evidence;
create trigger trg_evidence_path before insert on public.evidence for each row execute function public.evidence_path_guard();

-- ─── Tamper-evident audit log ───────────────────────────────────────────────

create or replace function public.audit_chain()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare last text;
begin
  perform pg_advisory_xact_lock(424242);
  select row_hash into last from public.audit_log order by id desc limit 1;
  new.prev_hash := coalesce(last, 'GENESIS');
  new.row_hash := encode(extensions.digest(
    new.prev_hash || '|' || new.at::text || '|' || coalesce(new.actor_id::text, '') || '|' ||
    new.action || '|' || new.entity || '|' || new.entity_id || '|' || new.details::text, 'sha256'), 'hex');
  return new;
end $$;
drop trigger if exists trg_audit_chain on public.audit_log;
create trigger trg_audit_chain before insert on public.audit_log for each row execute function public.audit_chain();

create or replace function public.audit_immutable()
returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only'; end $$;
drop trigger if exists trg_audit_immutable on public.audit_log;
create trigger trg_audit_immutable before update or delete on public.audit_log for each row execute function public.audit_immutable();

-- Generic row audit: records who changed what (only changed columns on UPDATE).
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  diff jsonb := '{}'::jsonb;
  k text;
  oldj jsonb;
  newj jsonb;
  ident text;
begin
  if tg_op = 'UPDATE' then
    oldj := to_jsonb(old); newj := to_jsonb(new);
    for k in select jsonb_object_keys(newj) loop
      if k not in ('updated_at') and (oldj -> k) is distinct from (newj -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('from', oldj -> k, 'to', newj -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then return new; end if;
  elsif tg_op = 'INSERT' then
    diff := to_jsonb(new);
  else
    diff := to_jsonb(old);
  end if;
  -- Never copy secrets into the log.
  diff := diff - 'key_hash';
  ident := coalesce(
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'ref',
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'code',
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'email',
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
    '');
  insert into public.audit_log (actor_id, actor_email, action, entity, entity_id, details)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()),
          tg_table_name || '.' || lower(tg_op), tg_table_name, ident, diff);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['suppliers','profiles','fabrics','lots','test_results','evidence','requirements','api_keys'] loop
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- Verifies the whole chain; returns the first broken id, or null if intact.
create or replace function public.verify_audit_chain()
returns bigint language plpgsql stable security definer set search_path = public, extensions as $$
declare r record; prev text := 'GENESIS';
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  for r in select * from public.audit_log order by id loop
    if r.prev_hash <> prev or r.row_hash <> encode(extensions.digest(
      r.prev_hash || '|' || r.at::text || '|' || coalesce(r.actor_id::text, '') || '|' ||
      r.action || '|' || r.entity || '|' || r.entity_id || '|' || r.details::text, 'sha256'), 'hex') then
      return r.id;
    end if;
    prev := r.row_hash;
  end loop;
  return null;
end $$;

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table public.test_methods enable row level security;
alter table public.decoration_methods enable row level security;
alter table public.decoration_method_tests enable row level security;
alter table public.requirements enable row level security;
alter table public.suppliers enable row level security;
alter table public.profiles enable row level security;
alter table public.fabrics enable row level security;
alter table public.lots enable row level security;
alter table public.test_results enable row level security;
alter table public.evidence enable row level security;
alter table public.lot_events enable row level security;
alter table public.notifications enable row level security;
alter table public.api_keys enable row level security;
alter table public.audit_log enable row level security;

-- Protocol reference: everyone signed in reads, admins write.
drop policy if exists p_tm_read on public.test_methods;
create policy p_tm_read on public.test_methods for select to authenticated using (true);
drop policy if exists p_tm_write on public.test_methods;
create policy p_tm_write on public.test_methods for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists p_dm_read on public.decoration_methods;
create policy p_dm_read on public.decoration_methods for select to authenticated using (true);
drop policy if exists p_dm_write on public.decoration_methods;
create policy p_dm_write on public.decoration_methods for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists p_dmt_read on public.decoration_method_tests;
create policy p_dmt_read on public.decoration_method_tests for select to authenticated using (true);
drop policy if exists p_dmt_write on public.decoration_method_tests;
create policy p_dmt_write on public.decoration_method_tests for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists p_req_read on public.requirements;
create policy p_req_read on public.requirements for select to authenticated using (true);
drop policy if exists p_req_write on public.requirements;
create policy p_req_write on public.requirements for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Suppliers
drop policy if exists p_sup_read on public.suppliers;
create policy p_sup_read on public.suppliers for select to authenticated using (public.can_see_supplier(id));
drop policy if exists p_sup_write on public.suppliers;
create policy p_sup_write on public.suppliers for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profiles: self + admin read; only admins write (accounts are created server-side).
drop policy if exists p_prof_read on public.profiles;
create policy p_prof_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists p_prof_write on public.profiles;
create policy p_prof_write on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Fabrics
drop policy if exists p_fab_read on public.fabrics;
create policy p_fab_read on public.fabrics for select to authenticated using (public.can_see_supplier(supplier_id));
drop policy if exists p_fab_insert on public.fabrics;
create policy p_fab_insert on public.fabrics for insert to authenticated with check (public.can_see_supplier(supplier_id));
drop policy if exists p_fab_update on public.fabrics;
create policy p_fab_update on public.fabrics for update to authenticated using (public.can_see_supplier(supplier_id)) with check (public.can_see_supplier(supplier_id));
drop policy if exists p_fab_delete on public.fabrics;
create policy p_fab_delete on public.fabrics for delete to authenticated using (public.is_admin());

-- Lots: suppliers create; only staff change status / decisions.
drop policy if exists p_lot_read on public.lots;
create policy p_lot_read on public.lots for select to authenticated using (public.can_see_supplier(supplier_id));
drop policy if exists p_lot_insert on public.lots;
create policy p_lot_insert on public.lots for insert to authenticated
  with check (public.is_staff() or exists (select 1 from public.fabrics f where f.id = fabric_id and f.supplier_id = public.my_supplier_id()));
drop policy if exists p_lot_update on public.lots;
create policy p_lot_update on public.lots for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists p_lot_delete on public.lots;
create policy p_lot_delete on public.lots for delete to authenticated using (public.is_admin());

-- Test results: suppliers add/remove while the lot is undecided; results are never edited in place.
drop policy if exists p_res_read on public.test_results;
create policy p_res_read on public.test_results for select to authenticated using (public.can_see_supplier(supplier_id));
drop policy if exists p_res_insert on public.test_results;
create policy p_res_insert on public.test_results for insert to authenticated with check (
  public.is_staff() or exists (
    select 1 from public.lots l where l.id = lot_id and l.supplier_id = public.my_supplier_id()
      and l.status in ('draft','submitted','in_review','retest','on_hold')));
drop policy if exists p_res_delete on public.test_results;
create policy p_res_delete on public.test_results for delete to authenticated using (
  public.is_staff() or exists (
    select 1 from public.lots l where l.id = lot_id and l.supplier_id = public.my_supplier_id()
      and l.status in ('draft','submitted','in_review','retest','on_hold')));

-- Evidence
drop policy if exists p_ev_read on public.evidence;
create policy p_ev_read on public.evidence for select to authenticated using (public.can_see_supplier(supplier_id));
drop policy if exists p_ev_insert on public.evidence;
create policy p_ev_insert on public.evidence for insert to authenticated with check (
  public.is_staff() or exists (select 1 from public.lots l where l.id = lot_id and l.supplier_id = public.my_supplier_id()));
drop policy if exists p_ev_delete on public.evidence;
create policy p_ev_delete on public.evidence for delete to authenticated using (public.is_admin());

-- Lot events: append-only timeline.
drop policy if exists p_evt_read on public.lot_events;
create policy p_evt_read on public.lot_events for select to authenticated using (public.can_see_supplier(supplier_id));
drop policy if exists p_evt_insert on public.lot_events;
create policy p_evt_insert on public.lot_events for insert to authenticated with check (
  actor_id = auth.uid() and (public.is_staff() or exists (select 1 from public.lots l where l.id = lot_id and l.supplier_id = public.my_supplier_id())));

-- Notifications: own only (rows are inserted server-side with the service role).
drop policy if exists p_ntf_read on public.notifications;
create policy p_ntf_read on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists p_ntf_update on public.notifications;
create policy p_ntf_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- API keys & audit: admins only. No insert/update/delete policies on audit_log → only triggers write it.
drop policy if exists p_key_all on public.api_keys;
create policy p_key_all on public.api_keys for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists p_audit_read on public.audit_log;
create policy p_audit_read on public.audit_log for select to authenticated using (public.is_admin());

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;

-- ─── Storage (private buckets) ──────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('evidence', 'evidence', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf','text/csv','application/octet-stream']),
  ('logos', 'logos', false, 2097152, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "evidence read" on storage.objects;
create policy "evidence read" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.can_see_supplier(((storage.foldername(name))[1])::uuid));
drop policy if exists "evidence insert" on storage.objects;
create policy "evidence insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and public.can_see_supplier(((storage.foldername(name))[1])::uuid));
drop policy if exists "evidence delete" on storage.objects;
create policy "evidence delete" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and public.is_admin());

drop policy if exists "logos read" on storage.objects;
create policy "logos read" on storage.objects for select to authenticated using (bucket_id = 'logos');
drop policy if exists "logos write" on storage.objects;
create policy "logos write" on storage.objects for insert to authenticated with check (bucket_id = 'logos' and public.is_admin());
drop policy if exists "logos update" on storage.objects;
create policy "logos update" on storage.objects for update to authenticated using (bucket_id = 'logos' and public.is_admin());
drop policy if exists "logos delete" on storage.objects;
create policy "logos delete" on storage.objects for delete to authenticated using (bucket_id = 'logos' and public.is_admin());

-- ─── BI layer (Power BI / Excel / warehouse) ────────────────────────────────
-- A separate, non-API schema with flattened read-only views. Connect Power BI
-- with the dedicated `bi_reader` login (see docs/POWER_BI.md); it can read
-- these views and nothing else.

create schema if not exists bi;

create or replace view bi.suppliers as
  select id as supplier_id, code, name, country, city, tier, status, created_at from public.suppliers;

create or replace view bi.fabrics as
  select f.id as fabric_id, f.code, f.name, f.fiber, f.composition, f.construction, f.weight_gsm, f.color, f.dye_class,
         s.code as supplier_code, s.name as supplier_name
  from public.fabrics f join public.suppliers s on s.id = f.supplier_id;

create or replace view bi.lots as
  select l.id as lot_id, l.ref, l.lot_number, l.po_number, l.program, l.garment_type, l.quantity_m,
         l.status, l.is_retest, l.parent_lot_id, l.lab_name, array_to_string(l.methods, ',') as methods,
         s.code as supplier_code, s.name as supplier_name, s.country,
         f.code as fabric_code, f.name as fabric_name, f.fiber,
         l.created_at, l.submitted_at, l.decided_at,
         date_trunc('month', coalesce(l.submitted_at, l.created_at))::date as month,
         case when l.decided_at is not null and l.submitted_at is not null
              then round(extract(epoch from (l.decided_at - l.submitted_at)) / 86400.0, 1) end as cycle_days,
         (l.status in ('approved','approved_concession')) as is_approved,
         (l.status = 'approved' and not l.is_retest and not exists (
            select 1 from public.lot_events e where e.lot_id = l.id and e.to_status in ('retest','rejected'))) as is_right_first_time
  from public.lots l
  join public.suppliers s on s.id = l.supplier_id
  join public.fabrics f on f.id = l.fabric_id;

create or replace view bi.test_readings as
  select r.id as result_id, l.ref as lot_ref, s.code as supplier_code, f.fiber,
         r.test_id, tm.code as test_code, tm.category, r.assessment, r.tested_at,
         r.color_id, (select c ->> 'name' from jsonb_array_elements(l.colors) c where c ->> 'id' = r.color_id) as color_name,
         kv.key as reading_key, (kv.value #>> '{}')::numeric as value,
         q.min_value, q.max_value,
         case
           when kv.value is null or jsonb_typeof(kv.value) <> 'number' then null
           when q.use_abs then (q.min_value is null or abs((kv.value #>> '{}')::numeric) >= q.min_value)
                           and (q.max_value is null or abs((kv.value #>> '{}')::numeric) <= q.max_value)
           else (q.min_value is null or (kv.value #>> '{}')::numeric >= q.min_value)
            and (q.max_value is null or (kv.value #>> '{}')::numeric <= q.max_value)
         end as pass
  from public.test_results r
  join public.lots l on l.id = r.lot_id
  join public.fabrics f on f.id = l.fabric_id
  join public.suppliers s on s.id = l.supplier_id
  join public.test_methods tm on tm.id = r.test_id
  cross join lateral jsonb_each(r.readings) kv
  left join public.requirements q on q.fiber = f.fiber and q.test_id = r.test_id and q.reading_key = kv.key
  where jsonb_typeof(kv.value) = 'number';

create or replace view bi.supplier_scorecard as
  select supplier_code, supplier_name,
         count(*) as lots,
         count(*) filter (where status in ('approved','approved_concession','rejected')) as decided,
         count(*) filter (where status = 'approved') as approved,
         count(*) filter (where status = 'approved_concession') as approved_concession,
         count(*) filter (where status = 'rejected') as rejected,
         count(*) filter (where status = 'retest') as retest,
         round(100.0 * count(*) filter (where is_right_first_time)
               / nullif(count(*) filter (where status in ('approved','approved_concession','rejected')), 0), 1) as rft_pct,
         round(avg(cycle_days), 1) as avg_cycle_days
  from bi.lots group by supplier_code, supplier_name;

-- Read-only login for Power BI. Set a strong password after running:
--   alter role bi_reader with password '…';
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'bi_reader') then
    create role bi_reader login nosuperuser nocreatedb nocreaterole noinherit;
  end if;
end $$;
revoke all on schema public from bi_reader;
grant usage on schema bi to bi_reader;
grant select on all tables in schema bi to bi_reader;
alter default privileges in schema bi grant select on tables to bi_reader;

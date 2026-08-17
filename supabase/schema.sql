-- Jossour School Transport - family + children + line capacity migration
create extension if not exists pgcrypto;

create sequence if not exists public.family_registration_seq start 1;
create sequence if not exists public.beneficiary_registration_seq start 1;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  registration_number bigint not null unique default nextval('public.family_registration_seq'),
  guardian_name text not null,
  guardian_phone text not null,
  guardian_address text not null default '',
  guardian_id_type text not null check (guardian_id_type in ('أب','أم','آخر')),
  guardian_relation text not null default '',
  guardian_cin text not null,
  family_status text not null default 'normal' check (family_status in ('normal','siblings','orphan')),
  children_count integer not null default 1 check (children_count between 1 and 3),
  death_certificate_path text,
  registration_fee integer not null default 100,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.families add column if not exists guardian_relation text not null default '';
alter table public.families add column if not exists registration_fee integer not null default 100;

-- Existing beneficiaries table is upgraded in place.
alter table public.beneficiaries add column if not exists family_id uuid;
alter table public.beneficiaries add column if not exists child_order integer default 1;
alter table public.beneficiaries add column if not exists route_number text default '';
alter table public.beneficiaries add column if not exists line_status text not null default 'waiting';
alter table public.beneficiaries drop constraint if exists beneficiaries_line_status_check;
alter table public.beneficiaries add constraint beneficiaries_line_status_check check (line_status in ('waiting','accepted'));
alter table public.beneficiaries add column if not exists guardian_relation text default '';
alter table public.beneficiaries drop column if exists email;

-- Legacy data backfill: one family per guardian CIN.
insert into public.families (
  guardian_name,
  guardian_phone,
  guardian_address,
  guardian_id_type,
  guardian_relation,
  guardian_cin,
  family_status,
  children_count,
  registration_fee,
  status,
  created_at,
  updated_at
)
select
  min(b.guardian_name),
  min(b.guardian_phone),
  min(coalesce(b.guardian_address,'')),
  min(b.guardian_id_type),
  min(coalesce(b.guardian_relation,'')),
  upper(trim(b.guardian_cin)),
  case when count(*) > 1 then 'siblings' else 'normal' end,
  least(count(*)::integer, 3),
  case when min(b.guardian_id_type) is not null then
    case when min(b.guardian_relation) is null then 100 else 100 end
  else 100 end,
  min(b.status),
  min(b.created_at),
  max(b.updated_at)
from public.beneficiaries b
where not exists (
  select 1 from public.families f
  where upper(trim(f.guardian_cin)) = upper(trim(b.guardian_cin))
)
group by upper(trim(b.guardian_cin));

-- Correct legacy fees when we can determine the family type from old data.
update public.families f
set registration_fee = case
  when f.family_status = 'orphan' then 0
  when f.children_count = 1 then 100
  when f.children_count = 2 then 150
  else 225
end;

update public.beneficiaries b
set family_id = f.id
from public.families f
where b.family_id is null
  and upper(trim(b.guardian_cin)) = upper(trim(f.guardian_cin));

update public.beneficiaries b
set guardian_relation = coalesce(f.guardian_relation, '')
from public.families f
where b.family_id = f.id;

with numbered as (
  select id,
         row_number() over (partition by family_id order by created_at, id) as rn
  from public.beneficiaries
  where family_id is not null
)
update public.beneficiaries b
set child_order = least(numbered.rn::integer, 3)
from numbered
where b.id = numbered.id;

alter table public.beneficiaries alter column family_id set not null;
alter table public.beneficiaries alter column child_order set not null;
alter table public.beneficiaries alter column child_order set default 1;

alter table public.families drop constraint if exists families_registration_fee_check;
alter table public.families add constraint families_registration_fee_check check (registration_fee in (0,100,150,225));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beneficiaries_family_fk'
  ) THEN
    ALTER TABLE public.beneficiaries
      ADD CONSTRAINT beneficiaries_family_fk
      FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beneficiaries_family_child_order_unique'
  ) THEN
    ALTER TABLE public.beneficiaries
      ADD CONSTRAINT beneficiaries_family_child_order_unique
      UNIQUE (family_id, child_order);
  END IF;
END $$;

-- Capacities of the seven transport lines.
create table if not exists public.bus_routes (
  route_number integer primary key,
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now()
);

insert into public.bus_routes(route_number, capacity)
values
  (1, 400),
  (2, 80),
  (3, 60),
  (4, 120),
  (5, 160),
  (6, 150),
  (7, 100)
on conflict (route_number) do update set capacity = excluded.capacity;

-- Existing approved children get a persistent line status once.
-- This does NOT auto-promote anyone after a deletion later.
with ranked as (
  select
    b.id,
    row_number() over (partition by b.bus_number order by b.created_at, b.registration_number, b.id) as rn,
    br.capacity
  from public.beneficiaries b
  join public.families f on f.id = b.family_id
  join public.bus_routes br on br.route_number = nullif(b.bus_number, '')::integer
  where f.status = 'approved'
    and b.status = 'approved'
)
update public.beneficiaries b
set line_status = case when ranked.rn <= ranked.capacity then 'accepted' else 'waiting' end
from ranked
where b.id = ranked.id;

create index if not exists families_guardian_cin_idx on public.families(guardian_cin);
create index if not exists families_guardian_phone_idx on public.families(guardian_phone);
create index if not exists families_status_idx on public.families(status);
create index if not exists beneficiaries_family_idx on public.beneficiaries(family_id);
create index if not exists beneficiaries_full_name_idx on public.beneficiaries using gin (to_tsvector('simple', full_name));
create index if not exists beneficiaries_phone_idx on public.beneficiaries(phone);
create index if not exists beneficiaries_cin_idx on public.beneficiaries(guardian_cin);
create index if not exists beneficiaries_bus_idx on public.beneficiaries(bus_number);
create index if not exists beneficiaries_route_idx on public.beneficiaries(route_number);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.calculate_family_fee(p_children_count integer, p_family_status text default 'normal')
returns integer
language sql
immutable
as $$
  select case
    when p_family_status = 'orphan' then 0
    when p_children_count = 1 then 100
    when p_children_count = 2 then 150
    when p_children_count = 3 then 225
    else 0
  end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists families_updated_at on public.families;
create trigger families_updated_at
before update on public.families
for each row execute function public.set_updated_at();

drop trigger if exists beneficiaries_updated_at on public.beneficiaries;
create trigger beneficiaries_updated_at
before update on public.beneficiaries
for each row execute function public.set_updated_at();

-- Clean up older register_family overloads.
drop function if exists public.register_family(uuid,text,text,text,text,text,text,integer,text,jsonb);
drop function if exists public.register_family(uuid,text,text,text,text,text,text,text,integer,text,jsonb);
drop function if exists public.register_beneficiary(uuid,text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text);

create or replace function public.register_family(
  p_family_id uuid,
  p_guardian_name text,
  p_guardian_phone text,
  p_guardian_address text,
  p_guardian_id_type text,
  p_guardian_relation text,
  p_guardian_cin text,
  p_family_status text,
  p_children_count integer,
  p_death_certificate_path text,
  p_children jsonb
)
returns table(
  family_id uuid,
  family_registration_number bigint,
  registration_numbers bigint[],
  registration_fee integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee integer;
  v_family_registration bigint;
  v_child jsonb;
  v_order integer := 0;
  v_child_id uuid;
  v_child_registration bigint;
  v_bus_number text;
begin
  perform pg_advisory_xact_lock(2026081501);
  perform pg_advisory_xact_lock(2026081502);

  if p_children_count not between 1 and 3 then
    raise exception 'عدد الأبناء يجب أن يكون بين 1 و3';
  end if;

  if jsonb_array_length(coalesce(p_children, '[]'::jsonb)) <> p_children_count then
    raise exception 'عدد ملفات الأبناء لا يطابق العدد المختار';
  end if;

  if nullif(trim(p_guardian_name),'') is null
     or nullif(trim(p_guardian_phone),'') is null
     or nullif(trim(p_guardian_address),'') is null
     or nullif(trim(p_guardian_cin),'') is null then
    raise exception 'المرجو إكمال معلومات ولي الأمر';
  end if;

  if p_family_status not in ('normal','siblings','orphan') then
    raise exception 'الحالة العائلية غير صحيحة';
  end if;

  if p_guardian_id_type not in ('أب','أم','آخر') then
    raise exception 'نوع حامل البطاقة غير صحيح';
  end if;

  if p_guardian_id_type = 'آخر' and nullif(trim(p_guardian_relation),'') is null then
    raise exception 'صلة القرابة مطلوبة عندما يكون حامل البطاقة آخر';
  end if;

  if p_family_status = 'orphan'
     and nullif(trim(coalesce(p_death_certificate_path,'')),'') is null then
    raise exception 'شهادة الوفاة مطلوبة في حالة يتيم';
  end if;

  if p_children_count = 1 and p_family_status = 'siblings' then
    raise exception 'حالة الإخوة تتطلب طفلين أو ثلاثة';
  end if;

  if p_children_count > 1 and p_family_status <> 'siblings' then
    raise exception 'اختيار أكثر من طفل يتطلب حالة إخوة';
  end if;

  if exists (
    select 1
    from public.families f
    where upper(trim(f.guardian_cin)) = upper(trim(p_guardian_cin))
  ) then
    raise exception 'هذا الرقم الوطني لولي الأمر مسجل مسبقاً';
  end if;

  v_fee := public.calculate_family_fee(p_children_count, p_family_status);

  select coalesce(min(g.n), coalesce(max(f.registration_number),0) + 1)
  into v_family_registration
  from generate_series(
    1,
    coalesce((select max(registration_number) from public.families),0) + 1
  ) as g(n)
  left join public.families f on f.registration_number = g.n
  where f.id is null;

  insert into public.families (
    id,
    registration_number,
    guardian_name,
    guardian_phone,
    guardian_address,
    guardian_id_type,
    guardian_relation,
    guardian_cin,
    family_status,
    children_count,
    death_certificate_path,
    registration_fee
  )
  values (
    p_family_id,
    v_family_registration,
    trim(p_guardian_name),
    trim(p_guardian_phone),
    trim(p_guardian_address),
    p_guardian_id_type,
    case when p_guardian_id_type = 'آخر' then trim(p_guardian_relation) else '' end,
    upper(trim(p_guardian_cin)),
    p_family_status,
    p_children_count,
    nullif(trim(coalesce(p_death_certificate_path,'')),''),
    v_fee
  );

  for v_child in select * from jsonb_array_elements(p_children) loop
    v_order := v_order + 1;
    v_child_id := (v_child->>'id')::uuid;
    v_bus_number := trim(v_child->>'bus_number');

    if nullif(trim(v_child->>'full_name'),'') is null
       or nullif(trim(v_child->>'education_level'),'') is null
       or nullif(trim(v_child->>'school'),'') is null
       or nullif(trim(v_child->>'phone'),'') is null
       or nullif(trim(v_child->>'address'),'') is null
       or nullif(trim(v_child->>'route_number'),'') is null
       or nullif(trim(v_child->>'bus_number'),'') is null
       or nullif(trim(v_child->>'bus_stop_number'),'') is null then
      raise exception 'المرجو إكمال معلومات الابن رقم %', v_order;
    end if;

    if not exists (
      select 1 from public.bus_routes br
      where br.route_number = v_bus_number::integer
    ) then
      raise exception 'رقم الحافلة للمستفيد رقم % غير صحيح', v_order;
    end if;

    select coalesce(min(g.n), coalesce(max(b.registration_number),0) + 1)
    into v_child_registration
    from generate_series(
      1,
      coalesce((select max(registration_number) from public.beneficiaries),0) + 1
    ) as g(n)
    left join public.beneficiaries b on b.registration_number = g.n
    where b.id is null;

    insert into public.beneficiaries (
      id,
      registration_number,
      family_id,
      child_order,
      full_name,
      education_level,
      class_number,
      school,
      birth_date,
      birth_place,
      phone,
      address,
      photo_path,
      guardian_name,
      guardian_phone,
      guardian_address,
      guardian_id_type,
      guardian_relation,
      guardian_cin,
      route_number,
      bus_number,
      bus_stop_number,
      line_status
    )
    values (
      v_child_id,
      v_child_registration,
      p_family_id,
      v_order,
      trim(v_child->>'full_name'),
      trim(v_child->>'education_level'),
      coalesce(trim(v_child->>'class_number'),''),
      trim(v_child->>'school'),
      nullif(v_child->>'birth_date','')::date,
      coalesce(trim(v_child->>'birth_place'),''),
      trim(v_child->>'phone'),
      trim(v_child->>'address'),
      nullif(trim(coalesce(v_child->>'photo_path','')), ''),
      trim(p_guardian_name),
      trim(p_guardian_phone),
      trim(p_guardian_address),
      p_guardian_id_type,
      case when p_guardian_id_type = 'آخر' then trim(p_guardian_relation) else '' end,
      upper(trim(p_guardian_cin)),
      trim(v_child->>'route_number'),
      v_bus_number,
      trim(v_child->>'bus_stop_number'),
      'waiting'
    );
  end loop;

  return query
  select
    p_family_id,
    v_family_registration,
    array(
      select b.registration_number
      from public.beneficiaries b
      where b.family_id = p_family_id
      order by b.child_order
    ),
    v_fee;
end;
$$;

revoke all on function public.register_family(uuid,text,text,text,text,text,text,text,integer,text,jsonb) from public;
grant execute on function public.register_family(uuid,text,text,text,text,text,text,text,integer,text,jsonb) to anon, authenticated;
grant execute on function public.calculate_family_fee(integer,text) to anon, authenticated;

-- Set family application status. Approval allocates currently free seats only.
-- Deleting an accepted record never promotes waiting records automatically because line_status is persisted.
create or replace function public.set_family_status(
  p_family_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child record;
  v_capacity integer;
  v_accepted_count integer;
  v_route integer;
begin
  if p_status not in ('pending','approved','rejected') then
    raise exception 'حالة الملف غير صحيحة';
  end if;

  perform pg_advisory_xact_lock(2026081599);

  update public.families
  set status = p_status, updated_at = now()
  where id = p_family_id;

  if not found then
    raise exception 'ملف العائلة غير موجود';
  end if;

  update public.beneficiaries
  set status = p_status, line_status = case when p_status = 'approved' then line_status else 'waiting' end, updated_at = now()
  where family_id = p_family_id;

  if p_status <> 'approved' then
    return;
  end if;

  -- On approval, fill any currently free seats for this family only.
  -- Remaining children stay in waiting. Later deletions do not auto-promote them.
  for v_child in
    select b.id, b.bus_number
    from public.beneficiaries b
    where b.family_id = p_family_id
    order by b.child_order
  loop
    if v_child.bus_number is null or nullif(trim(v_child.bus_number), '') is null then
      continue;
    end if;

    v_route := v_child.bus_number::integer;
    perform pg_advisory_xact_lock(2026081500 + v_route);

    select br.capacity into v_capacity
    from public.bus_routes br
    where br.route_number = v_route;

    if v_capacity is null then
      continue;
    end if;

    select count(*) into v_accepted_count
    from public.beneficiaries b
    join public.families f on f.id = b.family_id
    where f.status = 'approved'
      and b.status = 'approved'
      and b.bus_number = v_child.bus_number
      and b.line_status = 'accepted'
      and b.id <> v_child.id;

    if v_accepted_count < v_capacity then
      update public.beneficiaries
      set line_status = 'accepted', updated_at = now()
      where id = v_child.id;
    else
      update public.beneficiaries
      set line_status = 'waiting', updated_at = now()
      where id = v_child.id;
    end if;
  end loop;
end;
$$;

revoke all on function public.set_family_status(uuid,text) from public;
grant execute on function public.set_family_status(uuid,text) to authenticated;

-- Manually promote one waiting beneficiary to an available seat.
create or replace function public.accept_beneficiary_on_line(
  p_beneficiary_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_bus text;
  v_capacity integer;
  v_accepted_count integer;
begin
  perform pg_advisory_xact_lock(2026081599);

  select b.family_id, b.bus_number
  into v_family_id, v_bus
  from public.beneficiaries b
  where b.id = p_beneficiary_id
    and b.line_status = 'waiting';

  if v_family_id is null then
    raise exception 'المستفيد غير موجود أو راه مقبول أصلاً';
  end if;

  if not exists (
    select 1 from public.families f
    where f.id = v_family_id and f.status = 'approved'
  ) then
    raise exception 'خاص ملف العائلة يكون مقبول قبل قبول المستفيد في الخط';
  end if;

  perform pg_advisory_xact_lock(2026081500 + v_bus::integer);

  select br.capacity into v_capacity
  from public.bus_routes br
  where br.route_number = v_bus::integer;

  if v_capacity is null then
    raise exception 'الخط غير موجود';
  end if;

  select count(*) into v_accepted_count
  from public.beneficiaries b
  join public.families f on f.id = b.family_id
  where f.status = 'approved'
    and b.status = 'approved'
    and b.bus_number = v_bus
    and b.line_status = 'accepted';

  if v_accepted_count >= v_capacity then
    raise exception 'الخط رقم % عامر بالكامل (% من %)', v_bus, v_accepted_count, v_capacity;
  end if;

  update public.beneficiaries
  set line_status = 'accepted', updated_at = now()
  where id = p_beneficiary_id;
end;
$$;

revoke all on function public.accept_beneficiary_on_line(uuid) from public;
grant execute on function public.accept_beneficiary_on_line(uuid) to authenticated;

-- Manually return an accepted beneficiary to the waiting list.
create or replace function public.move_beneficiary_to_waiting(
  p_beneficiary_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(2026081599);

  update public.beneficiaries
  set line_status = 'waiting', updated_at = now()
  where id = p_beneficiary_id
    and line_status = 'accepted';

  if not found then
    raise exception 'المستفيد غير موجود أو راه فالانتظار أصلاً';
  end if;
end;
$$;

revoke all on function public.move_beneficiary_to_waiting(uuid) from public;
grant execute on function public.move_beneficiary_to_waiting(uuid) to authenticated;

alter table public.families enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.admin_users enable row level security;
alter table public.bus_routes enable row level security;

drop policy if exists "admins can read families" on public.families;
create policy "admins can read families"
on public.families for select to authenticated using (public.is_admin());

drop policy if exists "admins can update families" on public.families;
create policy "admins can update families"
on public.families for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete families" on public.families;
create policy "admins can delete families"
on public.families for delete to authenticated using (public.is_admin());

drop policy if exists "admins can read beneficiaries" on public.beneficiaries;
create policy "admins can read beneficiaries"
on public.beneficiaries for select to authenticated using (public.is_admin());

drop policy if exists "admins can update beneficiaries" on public.beneficiaries;
create policy "admins can update beneficiaries"
on public.beneficiaries for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete beneficiaries" on public.beneficiaries;
create policy "admins can delete beneficiaries"
on public.beneficiaries for delete to authenticated using (public.is_admin());

drop policy if exists "admins read self" on public.admin_users;
create policy "admins read self" on public.admin_users for select to authenticated using (user_id = auth.uid());

drop policy if exists "admins read bus routes" on public.bus_routes;
create policy "admins read bus routes" on public.bus_routes for select to authenticated using (public.is_admin());

insert into storage.buckets (id,name,public)
values ('beneficiary-photos','beneficiary-photos',false)
on conflict (id) do nothing;

drop policy if exists "public can upload beneficiary assets" on storage.objects;
create policy "public can upload beneficiary assets"
on storage.objects for insert to anon, authenticated
with check (
  bucket_id='beneficiary-photos'
  and (storage.foldername(name))[1]='pending'
);

drop policy if exists "admins can read beneficiary assets" on storage.objects;
create policy "admins can read beneficiary assets"
on storage.objects for select to authenticated
using (bucket_id='beneficiary-photos' and public.is_admin());

drop policy if exists "admins can update beneficiary assets" on storage.objects;
create policy "admins can update beneficiary assets"
on storage.objects for update to authenticated
using (bucket_id='beneficiary-photos' and public.is_admin())
with check (bucket_id='beneficiary-photos' and public.is_admin());

drop policy if exists "admins can delete beneficiary assets" on storage.objects;
create policy "admins can delete beneficiary assets"
on storage.objects for delete to authenticated
using (bucket_id='beneficiary-photos' and public.is_admin());

notify pgrst, 'reload schema';
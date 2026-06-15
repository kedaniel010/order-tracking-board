create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  customer_code text not null unique,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  existing_admin_count integer;
  new_customer_code text;
begin
  select count(*) into existing_admin_count
  from public.profiles
  where role = 'admin';

  new_customer_code := lower(trim(coalesce(new.raw_user_meta_data->>'customer_code', '')));

  if new_customer_code = '' then
    raise exception 'customer_code is required';
  end if;

  insert into public.profiles (id, email, customer_code, role)
  values (
    new.id,
    lower(new.email),
    new_customer_code,
    case when existing_admin_count = 0 then 'admin' else 'customer' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  customer_code text not null,
  order_date date not null,
  customer_invoice_no text not null,
  factory_invoice_no text,
  fe_date date,
  te_date date,
  production_finish_date date,
  oa_process text,
  production_status text not null default 'pending',
  u9_before_shipment text,
  so_no text,
  etd date,
  eta date,
  notes text,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'customer_name'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'customer_code'
  ) then
    alter table public.orders rename column customer_name to customer_code;
  end if;
end $$;

alter table public.orders add column if not exists customer_code text;
update public.orders
set customer_code = lower(trim(customer_code))
where customer_code is not null;

alter table public.profiles enable row level security;
alter table public.orders enable row level security;

drop policy if exists "profiles read own row" on public.profiles;
create policy "profiles read own row"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "admins read all orders" on public.orders;
create policy "admins read all orders"
on public.orders
for select
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders"
on public.orders
for select
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and customer_code = orders.customer_code
  )
);

drop policy if exists "admins insert orders" on public.orders;
create policy "admins insert orders"
on public.orders
for insert
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders"
on public.orders
for update
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

create or replace function public.apply_order_owner_user_id()
returns trigger
language plpgsql
security definer
as $$
begin
  new.owner_user_id := auth.uid();
  new.customer_code := lower(new.customer_code);
  return new;
end;
$$;

drop trigger if exists set_order_owner_user_id on public.orders;
create trigger set_order_owner_user_id
before insert or update on public.orders
for each row
execute procedure public.apply_order_owner_user_id();

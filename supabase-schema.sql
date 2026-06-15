create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_date date not null,
  customer_invoice_no text not null,
  factory_invoice_no text,
  customer_name text not null,
  factory_name text,
  fe_date date,
  te_date date,
  production_finish_date date,
  oa_process text,
  production_status text not null default 'pending',
  so_no text,
  up_before_shipment text,
  eta date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "users manage own orders" on public.orders;
create policy "users manage own orders"
on public.orders
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.apply_order_user_id()
returns trigger
language plpgsql
security definer
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists set_order_user_id on public.orders;
create trigger set_order_user_id
before insert or update on public.orders
for each row
execute procedure public.apply_order_user_id();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text not null check (char_length(btrim(full_name)) between 1 and 80),
  locale          text not null default 'es' check (locale in ('es', 'en')),
  currency        char(3) not null default 'EUR' check (currency = 'EUR'),
  week_starts_on  smallint not null default 1 check (week_starts_on in (0, 1)),
  timezone        text not null default 'Europe/Madrid',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  type         text not null check (type in ('income', 'expense')),
  icon         text not null default 'circle' check (char_length(icon) <= 40),
  color        text not null default 'sand'
               check (color in ('sage', 'sand', 'mist', 'blush', 'butter', 'lavender', 'peach', 'mint')),
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, type)
);
create unique index categories_user_type_name_uq on public.categories (user_id, type, lower(btrim(name)));

create table public.tasks (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title                text not null check (char_length(btrim(title)) between 1 and 120),
  description          text check (char_length(description) <= 2000),
  status               text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  priority             text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date             date,
  completed_at         timestamptz,
  planned_amount       numeric(12,2) check (planned_amount > 0),
  planned_category_id  uuid,
  planned_category_type text not null default 'expense' check (planned_category_type = 'expense'),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (id, user_id),
  check ((status = 'completed') = (completed_at is not null)),
  check ((planned_amount is null) = (planned_category_id is null)),
  foreign key (planned_category_id, user_id, planned_category_type)
    references public.categories (id, user_id, type) on delete restrict
);

create table public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id       uuid not null,
  task_id           uuid,
  type              text not null check (type in ('income', 'expense')),
  amount            numeric(12,2) not null check (amount > 0 and amount <= 9999999999.99),
  transaction_date  date not null,
  description       text check (char_length(description) <= 200),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (category_id, user_id, type)
    references public.categories (id, user_id, type) on delete restrict,
  foreign key (task_id, user_id)
    references public.tasks (id, user_id) on delete set null (task_id)
);

create table public.budgets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id    uuid not null,
  category_type  text not null default 'expense' check (category_type = 'expense'),
  amount         numeric(12,2) not null check (amount > 0),
  period_start   date not null check (extract(day from period_start) = 1),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, category_id, period_start),
  foreign key (category_id, user_id, category_type)
    references public.categories (id, user_id, type) on delete restrict
);

create table public.events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  task_id      uuid,
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  description  text check (char_length(description) <= 2000),
  location     text check (char_length(location) <= 120),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  all_day      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (task_id, user_id)
    references public.tasks (id, user_id) on delete set null (task_id)
);

create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc);
create index transactions_user_category_idx on public.transactions (user_id, category_id);
create index transactions_task_idx on public.transactions (task_id) where task_id is not null;
create index budgets_user_period_idx on public.budgets (user_id, period_start);
create index tasks_user_status_due_idx on public.tasks (user_id, status, due_date);
create index events_user_starts_idx on public.events (user_id, starts_at);
create index categories_user_idx on public.categories (user_id) where not is_archived;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'categories', 'tasks', 'transactions', 'budgets', 'events'] loop
    execute format('create trigger %1$s_updated_at before update on public.%1$s
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_locale text := coalesce(new.raw_user_meta_data ->> 'locale', 'es');
begin
  insert into public.profiles (id, full_name, locale)
  values (new.id,
          coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
          case when v_locale in ('es', 'en') then v_locale else 'es' end);

  insert into public.categories (user_id, name, type, icon, color)
  select new.id, case when v_locale = 'en' then c.name_en else c.name_es end, c.type, c.icon, c.color
  from (values
    ('Nómina',        'Salary',        'income',  'briefcase',      'sage'),
    ('Extras',        'Side income',   'income',  'sparkles',       'mint'),
    ('Vivienda',      'Housing',       'expense', 'house',          'sand'),
    ('Alimentación',  'Groceries',     'expense', 'shopping-cart',  'butter'),
    ('Transporte',    'Transport',     'expense', 'car',            'mist'),
    ('Suministros',   'Utilities',     'expense', 'zap',            'peach'),
    ('Salud',         'Health',        'expense', 'heart-pulse',    'blush'),
    ('Ocio',          'Leisure',       'expense', 'ticket',         'lavender'),
    ('Restaurantes',  'Eating out',    'expense', 'utensils',       'peach'),
    ('Suscripciones', 'Subscriptions', 'expense', 'repeat',         'mist'),
    ('Seguros',       'Insurance',     'expense', 'shield-check',   'sage'),
    ('Otros',         'Other',         'expense', 'ellipsis',       'sand')
  ) as c(name_es, name_en, type, icon, color);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $$
declare t text;
begin
  foreach t in array array['categories', 'tasks', 'transactions', 'budgets', 'events'] loop
    execute format('alter table public.%1$s enable row level security', t);
    execute format('create policy "%1$s_select_own" on public.%1$s for select to authenticated
                    using ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_insert_own" on public.%1$s for insert to authenticated
                    with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_update_own" on public.%1$s for update to authenticated
                    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_delete_own" on public.%1$s for delete to authenticated
                    using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

revoke all on all tables in schema public from anon;

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.tasks, public.transactions, public.budgets, public.events to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

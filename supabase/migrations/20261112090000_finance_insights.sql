create or replace function public.finance_summary(p_from date, p_to date)
returns table (income bigint, expense bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(round(sum(t.amount) filter (where t.type = 'income') * 100), 0)::bigint,
    coalesce(round(sum(t.amount) filter (where t.type = 'expense') * 100), 0)::bigint
  from public.transactions t
  where t.transaction_date between p_from and p_to;
$$;

create or replace function public.expenses_by_category(p_from date, p_to date)
returns table (category_id uuid, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.category_id, round(sum(t.amount) * 100)::bigint as total
  from public.transactions t
  where t.type = 'expense' and t.transaction_date between p_from and p_to
  group by t.category_id
  order by total desc, t.category_id;
$$;

create or replace function public.monthly_trend(p_last_month date, p_months integer default 6)
returns table (month date, income bigint, expense bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with months as (
    select (date_trunc('month', p_last_month) - make_interval(months => n))::date as month
    from generate_series(0, least(greatest(p_months, 1), 24) - 1) as n
  )
  select
    m.month,
    coalesce(round(sum(t.amount) filter (where t.type = 'income') * 100), 0)::bigint,
    coalesce(round(sum(t.amount) filter (where t.type = 'expense') * 100), 0)::bigint
  from months m
  left join public.transactions t
    on t.transaction_date >= m.month
   and t.transaction_date < (m.month + interval '1 month')::date
  group by m.month
  order by m.month;
$$;

revoke all on function public.finance_summary(date, date) from public, anon;
revoke all on function public.expenses_by_category(date, date) from public, anon;
revoke all on function public.monthly_trend(date, integer) from public, anon;
grant execute on function public.finance_summary(date, date) to authenticated;
grant execute on function public.expenses_by_category(date, date) to authenticated;
grant execute on function public.monthly_trend(date, integer) to authenticated;

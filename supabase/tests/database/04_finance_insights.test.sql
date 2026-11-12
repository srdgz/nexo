begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.com', '{"full_name": "User A"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@example.com', '{"full_name": "User B"}');

insert into public.transactions (user_id, category_id, type, amount, transaction_date)
select c.user_id, c.id, c.type, v.amount, v.day::date
from (values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Nómina', 3200.00, '2026-11-01'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Vivienda', 850.00, '2026-11-01'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Alimentación', 86.40, '2026-11-11'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Alimentación', 42.10, '2026-11-09'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Alimentación', 120.00, '2026-10-20'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Nómina', 3200.00, '2026-09-01'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Vivienda', 999.99, '2026-11-02')
) as v(user_id, category, amount, day)
join public.categories c on c.user_id = v.user_id and c.name = v.category;

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select results_eq(
  $$ select income, expense from public.finance_summary('2026-11-01', '2026-11-30') $$,
  $$ values (320000::bigint, 97850::bigint) $$,
  'the summary adds the month in cents and ignores other users'
);

select results_eq(
  $$ select income, expense from public.finance_summary('2027-01-01', '2027-01-31') $$,
  $$ values (0::bigint, 0::bigint) $$,
  'an empty period sums zero'
);

select results_eq(
  $$ select c.name, e.total
     from public.expenses_by_category('2026-11-01', '2026-11-30')
       with ordinality as e(category_id, total, position)
     join public.categories c on c.id = e.category_id
     order by e.position $$,
  $$ values ('Vivienda'::text, 85000::bigint), ('Alimentación'::text, 12850::bigint) $$,
  'expenses by category are ordered from the largest'
);

select is(
  (select count(*)::int from public.monthly_trend('2026-11-15', 6)),
  6,
  'the trend always returns the requested number of months'
);

select results_eq(
  $$ select month, income, expense from public.monthly_trend('2026-11-15', 3) $$,
  $$ values
       ('2026-09-01'::date, 320000::bigint, 0::bigint),
       ('2026-10-01'::date, 0::bigint, 12000::bigint),
       ('2026-11-01'::date, 320000::bigint, 97850::bigint) $$,
  'the trend fills months without movements with zero'
);

select is(
  (select count(*)::int from public.monthly_trend('2026-11-01', 500)),
  24,
  'the trend is capped at 24 months'
);

set local role anon;
set local request.jwt.claim.sub = '';

select throws_ok(
  $$ select * from public.finance_summary('2026-11-01', '2026-11-30') $$,
  '42501',
  null,
  'anon cannot read the summary'
);
select throws_ok(
  $$ select * from public.monthly_trend('2026-11-01', 6) $$,
  '42501',
  null,
  'anon cannot read the trend'
);

select * from finish();
rollback;

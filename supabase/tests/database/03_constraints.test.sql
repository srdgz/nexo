begin;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.com', '{"full_name": "User A"}');

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select throws_ok(
  $$ insert into public.transactions (category_id, type, amount, transaction_date)
     select id, 'expense', 10, current_date from public.categories where name = 'Nómina' $$,
  '23503',
  null,
  'DB-01 an expense cannot use an income category'
);

select lives_ok(
  $$ insert into public.budgets (category_id, amount, period_start)
     select id, 400, '2026-11-01' from public.categories where name = 'Alimentación' $$,
  'a budget for a month can be created'
);
select throws_ok(
  $$ insert into public.budgets (category_id, amount, period_start)
     select id, 300, '2026-11-01' from public.categories where name = 'Alimentación' $$,
  '23505',
  null,
  'DB-02 a second budget for the same category and month is rejected'
);
select throws_ok(
  $$ insert into public.budgets (category_id, amount, period_start)
     select id, 300, '2026-12-15' from public.categories where name = 'Alimentación' $$,
  '23514',
  null,
  'DB-03 a budget must start on the first day of the month'
);
select throws_ok(
  $$ insert into public.budgets (category_id, amount, period_start)
     select id, 300, '2026-12-01' from public.categories where name = 'Nómina' $$,
  '23503',
  null,
  'budgets only accept expense categories'
);

select throws_ok(
  $$ insert into public.events (title, starts_at, ends_at)
     values ('Meeting', '2026-11-11 10:00+01', '2026-11-11 09:00+01') $$,
  '23514',
  null,
  'DB-04 an event cannot end before it starts'
);

select throws_ok(
  $$ insert into public.tasks (title, status) values ('Done task', 'completed') $$,
  '23514',
  null,
  'DB-05 a completed task needs completed_at'
);

select throws_ok(
  $$ insert into public.tasks (title, planned_amount) values ('Half planned', 50) $$,
  '23514',
  null,
  'a planned payment needs both amount and category'
);

with task as (
  insert into public.tasks (title, planned_amount, planned_category_id)
  select 'Pay the car insurance', 449.90, id from public.categories where name = 'Seguros'
  returning id
)
insert into public.transactions (category_id, task_id, type, amount, transaction_date)
select c.id, task.id, 'expense', 449.90, current_date
from public.categories c, task
where c.name = 'Seguros';

delete from public.tasks where title = 'Pay the car insurance';

select results_eq(
  $$ select task_id, amount from public.transactions where amount = 449.90 $$,
  $$ values (null::uuid, 449.90::numeric) $$,
  'DB-06 deleting a task keeps its transactions without the link'
);

select throws_ok(
  $$ delete from public.categories where name = 'Alimentación' $$,
  '23001',
  null,
  'a category with budgets cannot be deleted'
);

select * from finish();
rollback;

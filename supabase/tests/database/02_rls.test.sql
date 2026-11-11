begin;
select plan(20);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.com', '{"full_name": "User A"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@example.com', '{"full_name": "User B"}');

create temporary table b_rows on commit drop as
select
  (select id from public.categories
   where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and name = 'Alimentación') as category_id,
  gen_random_uuid() as task_id,
  gen_random_uuid() as transaction_id;

insert into public.tasks (id, user_id, title)
select task_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Pay the car insurance' from b_rows;

insert into public.transactions (id, user_id, category_id, task_id, type, amount, transaction_date)
select transaction_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', category_id, task_id, 'expense', 45.90, current_date
from b_rows;

insert into public.budgets (user_id, category_id, amount, period_start)
select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', category_id, 400, date_trunc('month', current_date)::date
from b_rows;

insert into public.events (user_id, title, starts_at, ends_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dentist', now() + interval '1 day', now() + interval '1 day 1 hour');

grant select on b_rows to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is((select count(*)::int from public.categories), 12, 'A sees only their own 12 categories');
select is_empty($$ select 1 from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$, 'RLS-01 A does not see the profile of B');
select is_empty($$ select 1 from public.transactions $$, 'RLS-01 A does not see the transactions of B');
select is_empty($$ select 1 from public.tasks $$, 'RLS-01 A does not see the tasks of B');
select is_empty($$ select 1 from public.events $$, 'RLS-01 A does not see the events of B');
select is_empty($$ select 1 from public.budgets $$, 'RLS-01 A does not see the budgets of B');

select is_empty(
  $$ update public.transactions set amount = 1 where id = (select transaction_id from b_rows) returning id $$,
  'RLS-02 A cannot update a transaction of B'
);
select is_empty(
  $$ delete from public.tasks where id = (select task_id from b_rows) returning id $$,
  'RLS-02 A cannot delete a task of B'
);
select is_empty(
  $$ update public.profiles set full_name = 'Hacked' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' returning id $$,
  'RLS-02 A cannot update the profile of B'
);

select throws_ok(
  $$ insert into public.tasks (user_id, title) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Injected') $$,
  '42501',
  null,
  'RLS-03 A cannot insert rows for B'
);

select throws_ok(
  $$ insert into public.transactions (category_id, type, amount, transaction_date)
     select category_id, 'expense', 10, current_date from b_rows $$,
  '23503',
  null,
  'RLS-04 A cannot use a category of B in a transaction'
);
select throws_ok(
  $$ insert into public.budgets (category_id, amount, period_start)
     select category_id, 100, date_trunc('month', current_date)::date from b_rows $$,
  '23503',
  null,
  'RLS-04 A cannot use a category of B in a budget'
);
select throws_ok(
  $$ insert into public.transactions (category_id, task_id, type, amount, transaction_date)
     select c.id, b.task_id, 'expense', 10, current_date
     from public.categories c, b_rows b where c.name = 'Alimentación' $$,
  '23503',
  null,
  'RLS-05 A cannot link a transaction to a task of B'
);

select lives_ok(
  $$ insert into public.transactions (category_id, type, amount, transaction_date)
     select id, 'expense', 12.50, current_date from public.categories where name = 'Alimentación' $$,
  'A can record an expense with their own category without sending user_id'
);

set local role anon;
set local request.jwt.claim.sub = '';

select throws_ok($$ select * from public.profiles $$, '42501', null, 'RLS-06 anon cannot read profiles');
select throws_ok($$ select * from public.categories $$, '42501', null, 'RLS-06 anon cannot read categories');
select throws_ok($$ select * from public.transactions $$, '42501', null, 'RLS-06 anon cannot read transactions');
select throws_ok($$ select * from public.budgets $$, '42501', null, 'RLS-06 anon cannot read budgets');
select throws_ok($$ select * from public.tasks $$, '42501', null, 'RLS-06 anon cannot read tasks');
select throws_ok($$ select * from public.events $$, '42501', null, 'RLS-06 anon cannot read events');

select * from finish();
rollback;

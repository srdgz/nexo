begin;
select plan(2);

select set_eq(
  $$ select tablename::text from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' $$,
  array['categories', 'transactions', 'budgets', 'tasks', 'events'],
  'finance and organization tables publish their changes'
);
select is_empty(
  $$ select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'profiles' $$,
  'profiles are not published'
);

select * from finish();
rollback;

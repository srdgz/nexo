begin;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', '{"full_name": "Ana López", "locale": "es"}'),
  ('22222222-2222-2222-2222-222222222222', 'ben@example.com', '{"full_name": "Ben Smith", "locale": "en"}'),
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com', '{"full_name": "  ", "locale": "fr"}');

select results_eq(
  $$ select full_name, locale, currency::text from public.profiles
     where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('Ana López'::text, 'es'::text, 'EUR'::text) $$,
  'DB-07 signup creates the profile with the name, language and EUR'
);

select is(
  (select count(*)::int from public.categories where user_id = '11111111-1111-1111-1111-111111111111'),
  12,
  'DB-07 signup creates 12 categories'
);

select results_eq(
  $$ select type, count(*)::int from public.categories
     where user_id = '11111111-1111-1111-1111-111111111111' group by type order by type $$,
  $$ values ('expense'::text, 10), ('income'::text, 2) $$,
  'DB-07 two income and ten expense categories'
);

select ok(
  exists (
    select 1 from public.categories
    where user_id = '11111111-1111-1111-1111-111111111111' and name = 'Alimentación' and type = 'expense'
  ),
  'DB-07 categories use Spanish names for Spanish users'
);

select ok(
  exists (
    select 1 from public.categories
    where user_id = '22222222-2222-2222-2222-222222222222' and name = 'Groceries' and type = 'expense'
  ),
  'DB-07 categories use English names for English users'
);

select results_eq(
  $$ select full_name, locale from public.profiles where id = '33333333-3333-3333-3333-333333333333' $$,
  $$ values ('carla'::text, 'es'::text) $$,
  'DB-07 a blank name falls back to the email and an unknown language to Spanish'
);

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*)::int from public.categories where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'deleting the auth user removes the profile and its data'
);

select * from finish();
rollback;

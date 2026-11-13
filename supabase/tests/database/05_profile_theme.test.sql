begin;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.com', '{"full_name": "User A"}');

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  (select theme from public.profiles),
  'system',
  'a new profile follows the system theme'
);
select lives_ok(
  $$ update public.profiles set theme = 'dark' $$,
  'the owner can choose the dark theme'
);
select throws_ok(
  $$ update public.profiles set theme = 'sepia' $$,
  '23514',
  null,
  'an unknown theme is rejected'
);

select * from finish();
rollback;

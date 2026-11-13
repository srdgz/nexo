begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.com', '{"full_name": "User A"}');

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  (select avatar_url from public.profiles),
  null,
  'a new profile has no photo'
);
select lives_ok(
  $$ update public.profiles
     set avatar_url = 'https://res.cloudinary.com/demo/image/upload/v1/nexo/avatars/a' $$,
  'the owner can save a photo url'
);
select throws_ok(
  $$ update public.profiles set avatar_url = 'javascript:alert(1)' $$,
  '23514',
  null,
  'only https photo urls are accepted'
);
select lives_ok(
  $$ update public.profiles set avatar_url = null $$,
  'the owner can remove the photo'
);

select * from finish();
rollback;

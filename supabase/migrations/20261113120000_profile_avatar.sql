alter table public.profiles
  add column avatar_url text
  check (avatar_url is null or (avatar_url ~ '^https://' and length(avatar_url) <= 500));

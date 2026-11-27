-- Profile banner metadata for the public/full profile surface. The image bytes
-- live in the configured object-storage adapter; only provider-neutral URLs and
-- accessibility text are stored here.

alter table profiles
  add column if not exists banner_url text,
  add column if not exists banner_alt text check (banner_alt is null or char_length(banner_alt) <= 300);

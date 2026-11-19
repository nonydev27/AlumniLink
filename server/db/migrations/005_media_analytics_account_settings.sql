-- Provider-neutral media metadata, privacy-preserving aggregate analytics inputs,
-- and non-destructive account deactivation state.

alter table users
  add column if not exists deactivated_at timestamptz;

create index if not exists users_active_account_idx
  on users (id)
  where status = 'active' and deactivated_at is null;

create table if not exists media_assets (
  id                  uuid primary key default gen_random_uuid(),
  owner_user_id       uuid not null references users(id) on delete cascade,
  status              text not null default 'pending'
                        check (status in ('pending', 'confirmed', 'rejected', 'deleted')),
  provider            text,
  object_key          text,
  content_type        text,
  byte_size           bigint,
  alt_text            text check (alt_text is null or char_length(alt_text) <= 300),
  created_at          timestamptz not null default now(),
  confirmed_at        timestamptz,
  deleted_at          timestamptz,
  check (byte_size is null or byte_size > 0),
  check (
    status <> 'confirmed'
    or (
      provider is not null
      and char_length(btrim(provider)) > 0
      and object_key is not null
      and char_length(btrim(object_key)) > 0
      and content_type like 'image/%'
      and byte_size is not null
      and alt_text is not null
      and char_length(btrim(alt_text)) > 0
      and confirmed_at is not null
    )
  ),
  check (status <> 'deleted' or deleted_at is not null)
);
create index if not exists media_assets_owner_status_idx
  on media_assets (owner_user_id, status, created_at desc);
create unique index if not exists media_assets_provider_object_key
  on media_assets (provider, object_key)
  where provider is not null and object_key is not null;

-- Store an application-generated HMAC digest of the viewer key, never the raw
-- user ID, IP address, or browser fingerprint. Keep event rows for at most 30 days.
create table if not exists profile_view_events (
  id                  bigint generated always as identity primary key,
  profile_owner_id    uuid not null references users(id) on delete cascade,
  viewer_key_hash     bytea not null check (octet_length(viewer_key_hash) = 32),
  viewed_on           date not null default current_date,
  created_at          timestamptz not null default now(),
  unique (profile_owner_id, viewer_key_hash, viewed_on)
);
create index if not exists profile_view_events_retention_idx
  on profile_view_events (created_at);
create index if not exists profile_view_events_owner_day_idx
  on profile_view_events (profile_owner_id, viewed_on);

create table if not exists profile_search_appearance_events (
  id                  bigint generated always as identity primary key,
  profile_owner_id    uuid not null references users(id) on delete cascade,
  viewer_key_hash     bytea not null check (octet_length(viewer_key_hash) = 32),
  appeared_on         date not null default current_date,
  created_at          timestamptz not null default now(),
  unique (profile_owner_id, viewer_key_hash, appeared_on)
);
create index if not exists profile_search_appearances_retention_idx
  on profile_search_appearance_events (created_at);
create index if not exists profile_search_appearances_owner_day_idx
  on profile_search_appearance_events (profile_owner_id, appeared_on);

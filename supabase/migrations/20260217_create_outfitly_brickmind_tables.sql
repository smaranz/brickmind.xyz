create table if not exists public.chat_message (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  session_id text not null,
  role integer not null default 0 check (role in (0, 1, 2)),
  text_content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brick_collection (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  brick_type text not null,
  color text not null,
  quantity integer not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brick_type, color)
);

create table if not exists public.saved_build (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  description text,
  difficulty_level integer not null default 0 check (difficulty_level between 0 and 3),
  brick_count integer not null default 0 check (brick_count >= 0),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  image_url text,
  detected_bricks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_message_session_id on public.chat_message (session_id);
create index if not exists idx_chat_message_user_id on public.chat_message (user_id);
create index if not exists idx_chat_message_created_at on public.chat_message (created_at desc);

create index if not exists idx_brick_collection_user_id on public.brick_collection (user_id);
create index if not exists idx_saved_build_user_id on public.saved_build (user_id);
create index if not exists idx_saved_build_difficulty_level on public.saved_build (difficulty_level);
create index if not exists idx_scan_history_user_id on public.scan_history (user_id);

grant select, insert, update, delete on table public.chat_message to anon, authenticated;
grant select, insert, update, delete on table public.brick_collection to anon, authenticated;
grant select, insert, update, delete on table public.saved_build to anon, authenticated;
grant select, insert, update, delete on table public.scan_history to anon, authenticated;

-- Ejecuta este archivo una sola vez en Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  title text not null check (char_length(title) between 1 and 80),
  teacher_name text not null check (char_length(teacher_name) between 1 and 60),
  teacher_pin_hash text not null,
  teacher_user_id uuid references auth.users(id),
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  role text not null check (role in ('teacher', 'student')),
  token uuid not null unique default gen_random_uuid(),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists one_teacher_per_room
  on public.participants(room_id)
  where role = 'teacher';

create index if not exists participants_room_presence
  on public.participants(room_id, last_seen_at desc);

create table if not exists public.cargo_loads (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  actor_name text not null,
  side text not null check (side in ('port', 'starboard')),
  mass_kg integer not null check (mass_kg between 1000 and 100000),
  longitudinal numeric not null check (longitudinal in (-10, 0, 10)),
  created_at timestamptz not null default now()
);

create index if not exists cargo_room_created
  on public.cargo_loads(room_id, created_at);
create index if not exists cargo_participant_created
  on public.cargo_loads(participant_id, created_at desc);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  actor_name text not null,
  kind text not null check (kind in ('add', 'remove', 'reset', 'close', 'join')),
  side text check (side is null or side in ('port', 'starboard')),
  mass_kg integer check (mass_kg is null or mass_kg between 1000 and 100000),
  created_at timestamptz not null default now()
);

create index if not exists activities_room_created
  on public.activities(room_id, created_at desc);

-- Solo las rutas privadas del servidor usan la service_role key.
-- El navegador no recibe acceso directo a estas tablas.
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.cargo_loads enable row level security;
alter table public.activities enable row level security;

create or replace function public.touch_room_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
before update on public.rooms
for each row execute function public.touch_room_updated_at();

-- Actualización compatible con salas existentes.
alter table public.rooms add column if not exists teacher_user_id uuid references auth.users(id);

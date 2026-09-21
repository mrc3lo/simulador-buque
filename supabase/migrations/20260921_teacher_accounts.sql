-- Ejecutar en Supabase > SQL Editor antes de crear clases con el nuevo login.
-- Conserva todas las salas, participantes y cargas existentes.
alter table public.rooms
  add column if not exists teacher_user_id uuid references auth.users(id);

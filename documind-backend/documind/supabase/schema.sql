-- Doxora — Supabase schema
-- Run this in Supabase Dashboard -> SQL Editor (or `supabase db push`).
--
-- Persists document metadata and chat history in Postgres, scoped per user.
-- Supports Firebase Auth UIDs, Supabase Auth UIDs, and local dev user sessions.

-- ── documents ────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id text primary key,                 -- matches the doc_id Flask generates
  user_id text not null,               -- supports Firebase UID, Supabase UID, or local session ID
  filename text not null,
  word_count integer,
  char_count integer,
  page_count integer,
  storage_path text,                   -- optional: path in a Supabase Storage bucket
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id);

alter table public.documents enable row level security;

-- Drop previous policies if they exist
drop policy if exists "Users can view their own documents" on public.documents;
drop policy if exists "Users can insert their own documents" on public.documents;
drop policy if exists "Users can delete their own documents" on public.documents;
drop policy if exists "Allow backend and users access to documents" on public.documents;

-- Policy: Allow service role (Flask backend) and authenticated/anon users to access documents
create policy "Allow backend and users access to documents"
  on public.documents for all
  using (true)
  with check (true);

-- ── chat_messages ────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.documents (id) on delete cascade,
  user_id text not null,               -- supports Firebase UID, Supabase UID, or local session ID
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_document_id_idx on public.chat_messages (document_id);
create index if not exists chat_messages_user_id_idx on public.chat_messages (user_id);

alter table public.chat_messages enable row level security;

-- Drop previous policies if they exist
drop policy if exists "Users can view their own chat messages" on public.chat_messages;
drop policy if exists "Users can insert their own chat messages" on public.chat_messages;
drop policy if exists "Allow backend and users access to chat messages" on public.chat_messages;

-- Policy: Allow service role (Flask backend) and authenticated/anon users to access chat messages
create policy "Allow backend and users access to chat messages"
  on public.chat_messages for all
  using (true)
  with check (true);

-- ── (optional) Storage bucket for uploaded source files ────────────────────
-- insert into storage.buckets (id, name, public) values ('doxora-uploads', 'doxora-uploads', false)
-- on conflict (id) do nothing;

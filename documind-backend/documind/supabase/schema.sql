-- DocuMind — Supabase schema
-- Run this in Supabase Dashboard -> SQL Editor (or `supabase db push`).
--
-- Auth itself (sign up / log in) is handled entirely by Supabase's built-in
-- auth.users table — nothing to create for that. These two tables let you
-- persist document metadata and chat history in Postgres, scoped per user
-- with Row Level Security, instead of (or alongside) the Flask backend's
-- in-memory store.

-- ── documents ────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id text primary key,                 -- matches the doc_id Flask generates
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  word_count integer,
  char_count integer,
  page_count integer,
  storage_path text,                   -- optional: path in a Supabase Storage bucket
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id);

alter table public.documents enable row level security;

create policy "Users can view their own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own documents"
  on public.documents for delete
  using (auth.uid() = user_id);

-- ── chat_messages ────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_document_id_idx on public.chat_messages (document_id);

alter table public.chat_messages enable row level security;

create policy "Users can view their own chat messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own chat messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

-- ── (optional) Storage bucket for uploaded source files ────────────────────
-- insert into storage.buckets (id, name, public) values ('documind-uploads', 'documind-uploads', false)
-- on conflict (id) do nothing;
--
-- create policy "Users can access their own uploads"
--   on storage.objects for all
--   using (bucket_id = 'documind-uploads' and auth.uid()::text = (storage.foldername(name))[1]);

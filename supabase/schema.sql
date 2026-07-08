-- ============================================================
-- DocManager - Database Schema
-- Run this ENTIRE script in: Supabase > SQL Editor > New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================
-- PROFILES TABLE
-- ============================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'viewer' check (role in ('admin', 'approver', 'viewer', 'uploader')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Drop existing policies before recreating (safe re-run)
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;

create policy "profiles_select"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "profiles_update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================
-- DOCUMENTS TABLE
-- ============================
create table if not exists public.documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text not null,
  document_type text not null check (document_type in ('invoice', 'credit_note')),
  status text not null default 'pending' check (status in ('pending', 'under_review', 'approved_1', 'approved_2', 'approved', 'rejected')),
  vendor_name text,
  invoice_number text,
  document_date date,
  amount numeric(15, 2),
  vat_amount numeric(15, 2),
  currency text not null default 'ZAR',
  is_duplicate boolean not null default false,
  duplicate_of uuid references public.documents(id) on delete set null,
  ai_extracted boolean not null default false,
  ai_confidence numeric(3, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_status_idx on public.documents(status);
create index if not exists documents_invoice_number_idx on public.documents(invoice_number);
create index if not exists documents_vendor_name_idx on public.documents(vendor_name);
create index if not exists documents_document_date_idx on public.documents(document_date);
create index if not exists documents_created_at_idx on public.documents(created_at desc);

alter table public.documents enable row level security;

drop policy if exists "documents_select" on public.documents;
drop policy if exists "documents_insert" on public.documents;
drop policy if exists "documents_update" on public.documents;

create policy "documents_select"
  on public.documents for select
  using (auth.role() = 'authenticated');

create policy "documents_insert"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "documents_update"
  on public.documents for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'approver')
    )
  );

-- ============================
-- APPROVAL STEPS TABLE
-- ============================
create table if not exists public.approval_steps (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid not null references public.documents(id) on delete cascade,
  step integer not null check (step in (1, 2, 3)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approver_id uuid references public.profiles(id) on delete set null,
  comments text,
  actioned_at timestamptz,
  created_at timestamptz not null default now(),
  unique(document_id, step)
);

create index if not exists approval_steps_document_id_idx on public.approval_steps(document_id);
create index if not exists approval_steps_approver_id_idx on public.approval_steps(approver_id);

alter table public.approval_steps enable row level security;

drop policy if exists "approval_steps_select" on public.approval_steps;
drop policy if exists "approval_steps_insert" on public.approval_steps;
drop policy if exists "approval_steps_update" on public.approval_steps;

create policy "approval_steps_select"
  on public.approval_steps for select
  using (auth.role() = 'authenticated');

create policy "approval_steps_insert"
  on public.approval_steps for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'approver')
    )
  );

create policy "approval_steps_update"
  on public.approval_steps for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'approver')
    )
  );

-- ============================
-- FUNCTION: updated_at trigger
-- ============================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
  before update on public.documents
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================
-- FUNCTION: auto-create 3 approval steps when a document is inserted
-- ============================
create or replace function public.create_approval_steps()
returns trigger language plpgsql security definer as $$
begin
  insert into public.approval_steps (document_id, step, status)
  values
    (new.id, 1, 'pending'),
    (new.id, 2, 'pending'),
    (new.id, 3, 'pending');
  return new;
end;
$$;

drop trigger if exists on_document_created on public.documents;
create trigger on_document_created
  after insert on public.documents
  for each row execute procedure public.create_approval_steps();

-- ============================
-- FUNCTION: auto-create profile on signup
-- ============================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

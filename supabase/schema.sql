create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'Creative' check (role in ('Creative', 'Approver', 'Assistant')),
  role_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists companies_name_unique_idx on public.companies (lower(name));

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  due_label text,
  due_at timestamptz,
  status text not null default 'Planning',
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists campaigns_company_name_unique_idx
  on public.campaigns (company_id, lower(name));

create index if not exists campaigns_created_by_idx
  on public.campaigns (created_by);

create table if not exists public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('Creative', 'Approver', 'Assistant')),
  created_at timestamptz not null default now(),
  unique (campaign_id, profile_id)
);

create index if not exists campaign_members_profile_idx
  on public.campaign_members (profile_id);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists folders_campaign_name_unique_idx
  on public.folders (campaign_id, lower(name));

create table if not exists public.content_items (
  id text primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  platform text not null check (platform in ('Instagram', 'TikTok', 'YouTube Shorts')),
  status text not null default 'Submitted' check (
    status in ('Submitted', 'In Review', 'Changes Requested', 'Approved', 'Archive Scheduled')
  ),
  content_type text not null check (content_type in ('Video', 'Image', 'Carousel')),
  folder text not null default 'Unsorted',
  due_label text,
  due_at timestamptz,
  owner_name text,
  version text not null default 'V1',
  size_label text not null default '0MB',
  file_name text,
  storage_key text,
  mime_type text,
  comments_count integer not null default 0,
  unresolved_count integer not null default 0,
  progress integer not null default 100 check (progress between 0 and 100),
  accent text,
  tags text[] not null default '{}',
  share_mode text not null default 'Private' check (share_mode in ('Private', 'Public')),
  approved_at timestamptz,
  archive_delete_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_items_campaign_created_idx
  on public.content_items (campaign_id, created_at desc);

create index if not exists campaigns_due_at_idx
  on public.campaigns (due_at);

create index if not exists content_items_due_at_idx
  on public.content_items (due_at);

create table if not exists public.content_comments (
  id uuid primary key default gen_random_uuid(),
  content_id text not null references public.content_items(id) on delete cascade,
  author_name text not null,
  role text not null,
  anchor text not null default 'General',
  body text not null,
  status text not null default 'Open' check (status in ('Open', 'Resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_comments_content_created_idx
  on public.content_comments (content_id, created_at desc);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'bell' check (kind in ('bell', 'check', 'archive', 'upload', 'comment', 'share')),
  title text not null,
  meta text not null default 'Just now',
  created_at timestamptz not null default now()
);

create index if not exists activity_events_created_idx
  on public.activity_events (created_at desc);

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  content_id text not null references public.content_items(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  mode text not null check (mode in ('Private', 'Public')),
  token text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists share_links_content_idx
  on public.share_links (content_id);

create index if not exists share_links_created_by_idx
  on public.share_links (created_by);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

drop trigger if exists content_items_set_updated_at on public.content_items;
create trigger content_items_set_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

drop trigger if exists content_comments_set_updated_at on public.content_comments;
create trigger content_comments_set_updated_at
before update on public.content_comments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, role_confirmed)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', new.email, 'User'),
    coalesce(new.raw_app_meta_data->>'role', 'Creative'),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.folders enable row level security;
alter table public.content_items enable row level security;
alter table public.content_comments enable row level security;
alter table public.activity_events enable row level security;
alter table public.share_links enable row level security;

drop policy if exists "Profiles can read own profile" on public.profiles;
create policy "Profiles can read own profile"
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "Profiles can update own profile" on public.profiles;
create policy "Profiles can update own profile"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Authenticated users can read workspace companies" on public.companies;
create policy "Authenticated users can read workspace companies"
on public.companies for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read workspace campaigns" on public.campaigns;
create policy "Authenticated users can read workspace campaigns"
on public.campaigns for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read campaign members" on public.campaign_members;
create policy "Authenticated users can read campaign members"
on public.campaign_members for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read workspace folders" on public.folders;
create policy "Authenticated users can read workspace folders"
on public.folders for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read content" on public.content_items;
create policy "Authenticated users can read content"
on public.content_items for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read comments" on public.content_comments;
create policy "Authenticated users can read comments"
on public.content_comments for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read activity" on public.activity_events;
create policy "Authenticated users can read activity"
on public.activity_events for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read share links" on public.share_links;
create policy "Authenticated users can read share links"
on public.share_links for select
to authenticated
using (true);

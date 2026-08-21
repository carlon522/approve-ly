insert into public.companies (name)
values ('Northstar Studio'), ('Kindred Goods'), ('Aster Home')
on conflict do nothing;

insert into public.campaigns (company_id, name, due_label, status, progress)
select id, 'Q3 Launch', 'Aug 28', 'Active', 72
from public.companies
where name = 'Northstar Studio'
on conflict do nothing;

insert into public.campaigns (company_id, name, due_label, status, progress)
select id, 'Evergreen Shorts', 'Sep 06', 'Review', 46
from public.companies
where name = 'Kindred Goods'
on conflict do nothing;

insert into public.folders (campaign_id, name)
select id, folder_name
from public.campaigns,
unnest(array['Paid social', 'Organic', 'Creator edits', 'Founder content']) as folder_name
where name = 'Q3 Launch'
on conflict do nothing;

insert into public.content_items (
  id,
  campaign_id,
  title,
  platform,
  status,
  content_type,
  folder,
  due_label,
  owner_name,
  version,
  size_label,
  comments_count,
  unresolved_count,
  accent,
  tags
)
select
  'APL-1084',
  id,
  'Summer drop reveal',
  'Instagram',
  'Changes Requested',
  'Video',
  'Paid social / Reels',
  'Today, 16:00',
  'Maya Chen',
  'V3',
  '1.4GB',
  2,
  2,
  '#0f8a5f',
  array['paid social', 'launch', 'creator']
from public.campaigns
where name = 'Q3 Launch'
on conflict (id) do nothing;

insert into public.activity_events (kind, title, meta)
values
  ('bell', 'Comment bundle sent', '11 minutes ago'),
  ('check', 'Founder short approved', '42 minutes ago'),
  ('archive', '3 files ready for final download', 'Today')
on conflict do nothing;

-- ============================================================
-- DYNAAMIQ OS — Supabase Schema
-- Im Supabase SQL Editor ausführen, um die Cloud-DB anzulegen.
-- Die App nutzt aktuell localStorage; dieses Schema spiegelt das
-- Datenmodell aus lib/types.ts für den späteren Cloud-Sync.
-- ============================================================

create table if not exists customers (
  id text primary key,
  company text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  address text,
  city text,
  zip text,
  country text default 'Deutschland',
  vat_id text,
  tags text[] default '{}',
  notes text,
  health text default 'lead',           -- active | lead | churned
  created_at timestamptz default now()
);

create table if not exists deals (
  id text primary key,
  title text not null,
  customer_id text references customers(id) on delete cascade,
  stage text default 'lead',            -- lead|qualified|proposal|negotiation|won|lost
  value numeric default 0,
  probability int default 10,
  owner text,
  expected_close timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table if not exists projects (
  id text primary key,
  name text not null,
  customer_id text references customers(id) on delete cascade,
  status text default 'planning',       -- planning|active|on_hold|done|canceled
  budget numeric default 0,
  spent numeric default 0,
  start_date timestamptz,
  due_date timestamptz,
  color text default '#ff6a00',
  description text,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id text primary key,
  project_id text references projects(id) on delete cascade,
  title text not null,
  status text default 'todo',           -- todo|doing|done
  assignee text,
  due timestamptz,
  hours numeric
);

create table if not exists invoices (
  id text primary key,
  number text not null,
  customer_id text references customers(id) on delete cascade,
  status text default 'draft',          -- draft|sent|paid|overdue|canceled
  issue_date timestamptz,
  due_date timestamptz,
  items jsonb default '[]',             -- LineItem[]
  notes text,
  project_id text,
  created_at timestamptz default now()
);

create table if not exists quotes (
  id text primary key,
  number text not null,
  customer_id text references customers(id) on delete cascade,
  status text default 'draft',          -- draft|sent|accepted|declined|expired
  issue_date timestamptz,
  valid_until timestamptz,
  items jsonb default '[]',
  notes text,
  created_at timestamptz default now()
);

create table if not exists templates (
  id text primary key,
  kind text not null,                   -- invoice|quote|email
  name text not null,
  subject text,
  body text,
  items jsonb,
  created_at timestamptz default now()
);

create table if not exists emails (
  id text primary key,
  "to" text,
  customer_id text,
  subject text,
  body text,
  status text default 'draft',          -- draft|sent
  related_type text,
  related_id text,
  created_at timestamptz default now()
);

create table if not exists transactions (
  id text primary key,
  type text not null,                   -- income|expense
  category text,
  description text,
  amount numeric default 0,
  tax_rate numeric default 0.19,
  date timestamptz,
  customer_id text,
  invoice_id text
);

create table if not exists activities (
  id text primary key,
  type text,
  title text,
  meta text,
  at timestamptz default now()
);

create table if not exists company_settings (
  id int primary key default 1,
  data jsonb not null
);

-- Single-user MVP: open RLS. Für Multi-User später pro-Tabelle policies setzen.
alter table customers enable row level security;
alter table deals enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table invoices enable row level security;
alter table quotes enable row level security;
alter table templates enable row level security;
alter table emails enable row level security;
alter table transactions enable row level security;
alter table activities enable row level security;
alter table company_settings enable row level security;

create policy "allow all (mvp)" on customers for all using (true) with check (true);
create policy "allow all (mvp)" on deals for all using (true) with check (true);
create policy "allow all (mvp)" on projects for all using (true) with check (true);
create policy "allow all (mvp)" on tasks for all using (true) with check (true);
create policy "allow all (mvp)" on invoices for all using (true) with check (true);
create policy "allow all (mvp)" on quotes for all using (true) with check (true);
create policy "allow all (mvp)" on templates for all using (true) with check (true);
create policy "allow all (mvp)" on emails for all using (true) with check (true);
create policy "allow all (mvp)" on transactions for all using (true) with check (true);
create policy "allow all (mvp)" on activities for all using (true) with check (true);
create policy "allow all (mvp)" on company_settings for all using (true) with check (true);

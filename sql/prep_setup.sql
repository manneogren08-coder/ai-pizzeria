-- Run this once in Supabase SQL editor to enable prep features.

create table if not exists prep_templates (
  company_id text primary key,
  template_text text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists prep_tasks (
  id bigint generated always as identity primary key,
  company_id text not null,
  prep_date date not null,
  title text not null,
  priority text not null default 'medium',
  station text not null default '',
  due_time text not null default '',
  is_done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists prep_tasks
  add column if not exists priority text not null default 'medium';

alter table if exists prep_tasks
  add column if not exists station text not null default '';

alter table if exists prep_tasks
  add column if not exists due_time text not null default '';

create index if not exists prep_tasks_company_date_idx
  on prep_tasks (company_id, prep_date, sort_order, id);

create table if not exists employee_accounts (
  id bigint generated always as identity primary key,
  company_id text not null,
  email text not null,
  display_name text not null default '',
  one_time_code_hash text,
  one_time_code_expires_at timestamptz,
  verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, email)
);

create index if not exists employee_accounts_company_email_idx
  on employee_accounts (company_id, email);

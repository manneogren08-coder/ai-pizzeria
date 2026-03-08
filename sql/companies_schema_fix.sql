-- Run this in Supabase SQL Editor to ensure admin fields can be persisted.
-- Safe to run multiple times.

alter table if exists public.companies
  add column if not exists support_email text,
  add column if not exists opening_hours text,
  add column if not exists closure_info text,
  add column if not exists menu text,
  add column if not exists recipes text,
  add column if not exists allergens text,
  add column if not exists routines text,
  add column if not exists opening_routine text,
  add column if not exists closing_routine text,
  add column if not exists behavior_guidelines text,
  add column if not exists staff_roles text,
  add column if not exists staff_situations text,
  add column if not exists query_count integer not null default 0,
  add column if not exists active boolean not null default true;

-- Optional: normalize null values to empty strings for text columns.
update public.companies
set
  support_email = coalesce(support_email, ''),
  opening_hours = coalesce(opening_hours, ''),
  closure_info = coalesce(closure_info, ''),
  menu = coalesce(menu, ''),
  recipes = coalesce(recipes, ''),
  allergens = coalesce(allergens, ''),
  routines = coalesce(routines, ''),
  opening_routine = coalesce(opening_routine, ''),
  closing_routine = coalesce(closing_routine, ''),
  behavior_guidelines = coalesce(behavior_guidelines, ''),
  staff_roles = coalesce(staff_roles, ''),
  staff_situations = coalesce(staff_situations, '');

-- Row Level Security setup for all core tables.
-- Safe to run multiple times (drops policies before recreating them).
--
-- All application access goes through the Next.js API routes using
-- SUPABASE_SERVICE_ROLE_KEY (see lib/supabase.js -> getSupabaseAdminClient),
-- which bypasses RLS entirely. These policies only need to block direct,
-- unauthenticated access to the database from a browser or any other
-- client holding the public NEXT_PUBLIC_SUPABASE_ANON_KEY.
--
-- Run this in the Supabase SQL Editor after verifying (Database > Tables >
-- a table > RLS) whether RLS is currently disabled on any of these tables.

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prep_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prep_templates ENABLE ROW LEVEL SECURITY;

-- Drop any older/conflicting policies from previous migration attempts so
-- this script can be re-run safely. These two in particular were found
-- granting full access to {public} (which includes anon) despite their
-- names suggesting otherwise - permissive policies are OR'd together in
-- Postgres, so a single "USING (true)" policy overrides every "Deny" policy
-- below for the same command.
DROP POLICY IF EXISTS "Allow anon read" ON public.companies;
DROP POLICY IF EXISTS "Allow service role full access" ON public.restaurant_staff;
DROP POLICY IF EXISTS "Deny anon select companies" ON public.companies;
DROP POLICY IF EXISTS "Deny anon insert companies" ON public.companies;
DROP POLICY IF EXISTS "Deny anon update companies" ON public.companies;
DROP POLICY IF EXISTS "Deny anon delete companies" ON public.companies;

DROP POLICY IF EXISTS "Deny anon select restaurant_staff" ON public.restaurant_staff;
DROP POLICY IF EXISTS "Deny anon insert restaurant_staff" ON public.restaurant_staff;
DROP POLICY IF EXISTS "Deny anon update restaurant_staff" ON public.restaurant_staff;
DROP POLICY IF EXISTS "Deny anon delete restaurant_staff" ON public.restaurant_staff;

DROP POLICY IF EXISTS "Deny anon select employee_accounts" ON public.employee_accounts;
DROP POLICY IF EXISTS "Deny anon insert employee_accounts" ON public.employee_accounts;
DROP POLICY IF EXISTS "Deny anon update employee_accounts" ON public.employee_accounts;
DROP POLICY IF EXISTS "Deny anon delete employee_accounts" ON public.employee_accounts;
DROP POLICY IF EXISTS "Users can view employee accounts for their company" ON public.employee_accounts;
DROP POLICY IF EXISTS "Users can manage employee accounts for their company" ON public.employee_accounts;
DROP POLICY IF EXISTS "Users can insert employee accounts for their company" ON public.employee_accounts;
DROP POLICY IF EXISTS "Users can update employee accounts for their company" ON public.employee_accounts;
DROP POLICY IF EXISTS "Users can delete employee accounts for their company" ON public.employee_accounts;
DROP POLICY IF EXISTS "Enable read access for users based on company_id" ON public.employee_accounts;
DROP POLICY IF EXISTS "Enable insert access for users based on company_id" ON public.employee_accounts;
DROP POLICY IF EXISTS "Enable update access for users based on company_id" ON public.employee_accounts;
DROP POLICY IF EXISTS "Enable delete access for users based on company_id" ON public.employee_accounts;
DROP POLICY IF EXISTS "Temporarily allow all access to employee_accounts" ON public.employee_accounts;

DROP POLICY IF EXISTS "Deny anon select prep_tasks" ON public.prep_tasks;
DROP POLICY IF EXISTS "Deny anon insert prep_tasks" ON public.prep_tasks;
DROP POLICY IF EXISTS "Deny anon update prep_tasks" ON public.prep_tasks;
DROP POLICY IF EXISTS "Deny anon delete prep_tasks" ON public.prep_tasks;

DROP POLICY IF EXISTS "Deny anon select prep_templates" ON public.prep_templates;
DROP POLICY IF EXISTS "Deny anon insert prep_templates" ON public.prep_templates;
DROP POLICY IF EXISTS "Deny anon update prep_templates" ON public.prep_templates;
DROP POLICY IF EXISTS "Deny anon delete prep_templates" ON public.prep_templates;

-- Deny all direct access from the anon key. The service-role key used
-- server-side bypasses RLS entirely, so the app keeps working normally.
CREATE POLICY "Deny anon select companies" ON public.companies FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert companies" ON public.companies FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update companies" ON public.companies FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete companies" ON public.companies FOR DELETE TO anon USING (false);

CREATE POLICY "Deny anon select restaurant_staff" ON public.restaurant_staff FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert restaurant_staff" ON public.restaurant_staff FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update restaurant_staff" ON public.restaurant_staff FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete restaurant_staff" ON public.restaurant_staff FOR DELETE TO anon USING (false);

CREATE POLICY "Deny anon select employee_accounts" ON public.employee_accounts FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert employee_accounts" ON public.employee_accounts FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update employee_accounts" ON public.employee_accounts FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete employee_accounts" ON public.employee_accounts FOR DELETE TO anon USING (false);

CREATE POLICY "Deny anon select prep_tasks" ON public.prep_tasks FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert prep_tasks" ON public.prep_tasks FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update prep_tasks" ON public.prep_tasks FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete prep_tasks" ON public.prep_tasks FOR DELETE TO anon USING (false);

CREATE POLICY "Deny anon select prep_templates" ON public.prep_templates FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert prep_templates" ON public.prep_templates FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update prep_templates" ON public.prep_templates FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete prep_templates" ON public.prep_templates FOR DELETE TO anon USING (false);

-- Verify: rowsecurity should read "true" for every table below, and each
-- table should show 4 "Deny anon ..." policies with qual = false.
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('companies', 'restaurant_staff', 'employee_accounts', 'prep_tasks', 'prep_templates');

SELECT tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('companies', 'restaurant_staff', 'employee_accounts', 'prep_tasks', 'prep_templates')
ORDER BY tablename, policyname;

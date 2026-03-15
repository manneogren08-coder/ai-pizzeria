-- Enable Row Level Security (RLS) on all core tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prep_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prep_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_accounts ENABLE ROW LEVEL SECURITY;

-- Deny all access to unauthenticated (anon) requests.
-- Next.js API routes will bypass this by using the SUPABASE_SERVICE_ROLE_KEY (getSupabaseAdminClient).
-- This completely prevents users from querying the database directly from the frontend.
CREATE POLICY "Deny anon select companies" ON public.companies FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert companies" ON public.companies FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update companies" ON public.companies FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete companies" ON public.companies FOR DELETE TO anon USING (false);

CREATE POLICY "Deny anon select prep_tasks" ON public.prep_tasks FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert prep_tasks" ON public.prep_tasks FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update prep_tasks" ON public.prep_tasks FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete prep_tasks" ON public.prep_tasks FOR DELETE TO anon USING (false);

CREATE POLICY "Deny anon select prep_templates" ON public.prep_templates FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert prep_templates" ON public.prep_templates FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update prep_templates" ON public.prep_templates FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete prep_templates" ON public.prep_templates FOR DELETE TO anon USING (false);

CREATE POLICY "Deny anon select employee_accounts" ON public.employee_accounts FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon insert employee_accounts" ON public.employee_accounts FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon update employee_accounts" ON public.employee_accounts FOR UPDATE TO anon USING (false);
CREATE POLICY "Deny anon delete employee_accounts" ON public.employee_accounts FOR DELETE TO anon USING (false);

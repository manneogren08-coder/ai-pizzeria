-- Enkel test av Supabase auth utan process.env
-- Kör detta för att felsöka auth-systemet

-- 1. Kolla JWT secret (om det går)
SELECT 'JWT_SECRET exists' as test;

-- 2. Kolla auth.uid() direkt
SELECT 
    auth.jwt() as current_jwt,
    auth.uid() as current_uid,
    auth.role() as current_role,
    auth.email() as current_email;

-- 3. Kolla RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('companies', 'restaurant_staff', 'employee_accounts');

-- 4. Testa manuellt auth.uid()
-- Ta en giltig JWT token från din browser localStorage
-- och kör:
-- SELECT auth.uid() FROM (SELECT 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' as token);

-- 5. Kolla befintliga employee accounts
SELECT 
    id,
    company_id,
    email,
    created_at
FROM employee_accounts 
ORDER BY created_at DESC
LIMIT 3;

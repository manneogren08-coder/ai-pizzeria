-- Detaljerad felsökning av RLS-policy:er

-- 1. Kolla exakta RLS-policy:er för employee_accounts
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'employee_accounts'
ORDER BY policyname;

-- 2. Kolla om policy:erna är aktiva
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'employee_accounts';

-- 3. Testa auth.uid() mot olika company_id värden
-- Kör detta för att se hur auth.uid() beter sig mot olika värden
SELECT 
    auth.uid() as current_uid,
    '1' as test_company_id,
    auth.uid() = '1' as matches_string,
    auth.uid()::text = '1'::text as matches_text_cast,
    auth.uid()::bigint = '1'::bigint as matches_bigint_cast;

-- 4. Kolla befintliga employee_accounts
SELECT 
    id,
    company_id,
    email,
    created_at,
    updated_at
FROM employee_accounts 
ORDER BY created_at DESC
LIMIT 5;

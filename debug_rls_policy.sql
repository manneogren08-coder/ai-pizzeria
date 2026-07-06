-- Felsökning av RLS-policy:er för employee_accounts
-- Kör detta för att se exakt vad som händer

-- 1. Kolla nuvarande RLS-policy:er
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'employee_accounts'
ORDER BY policyname;

-- 2. Kolla om auth.uid() matchar company_id
SELECT 
    auth.uid() as current_uid,
    company_id as test_company_id,
    auth.uid() = company_id as matches_direct,
    auth.uid()::text = company_id::text as matches_text,
    CASE 
        WHEN auth.uid() = company_id THEN 'MATCH'
        ELSE 'NO MATCH'
    END as match_result
FROM employee_accounts 
LIMIT 5;

-- 3. Testa INSERT manuellt med samma company_id
-- Detta ska visa om RLS tillåter INSERT
INSERT INTO employee_accounts (
    company_id,
    email,
    display_name,
    one_time_code_hash,
    one_time_code_expires_at,
    created_at,
    updated_at
) VALUES (
    (SELECT company_id FROM employee_accounts LIMIT 1),
    'test@debug.com',
    'Debug User',
    'dummy_hash',
    NOW() + INTERVAL '10 minutes',
    NOW(),
    NOW()
);

-- 4. Kolla vad som hände
SELECT 
    'INSERT test' as test_type,
    CASE 
        WHEN id IS NOT NULL THEN 'SUCCESS - RLS tillåter INSERT'
        ELSE 'FAILED - RLS blockerar INSERT'
    END as result
FROM (
    SELECT id FROM employee_accounts 
    WHERE email = 'test@debug.com' 
    ORDER BY created_at DESC 
    LIMIT 1
) test_result;

-- 5. Städa upp test-data
DELETE FROM employee_accounts 
WHERE email = 'test@debug.com';

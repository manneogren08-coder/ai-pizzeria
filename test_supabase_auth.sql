-- Testa Supabase auth och RLS
-- Kör detta för att felsöka auth-systemet

-- 1. Kolla om auth är aktiverat
SELECT 
    'JWT Secret' as setting,
    CASE 
        WHEN jwt_secret IS NOT NULL THEN 'OK'
        ELSE 'MISSING'
    END as status
FROM (
    SELECT unnest(string_to_array(process.env.JWT_SECRET)) as jwt_secret
) settings;

-- 2. Kolla JWT issuer
SELECT 
    auth.jwt() as current_jwt,
    auth.uid() as current_uid,
    auth.role() as current_role,
    auth.email() as current_email;

-- 3. Testa med manuellt JWT token
-- Kör detta för att se om auth.uid() fungerar med giltig token
-- Ersätt 'DIN_JWT_TOKEN_HÄR' med en giltig token från din app

-- SELECT 
--     auth.jwt() as current_jwt,
--     auth.uid() as current_uid,
--     auth.role() as current_role,
--     auth.email() as current_email
-- WHERE 
--     auth.jwt() = 'DIN_JWT_TOKEN_HÄR';

-- 4. Kolla RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    rowsecurity::text as rls_enabled
FROM pg_tables 
WHERE tablename IN ('companies', 'restaurant_staff', 'employee_accounts');

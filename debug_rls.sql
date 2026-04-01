-- Debug RLS policies
-- Kör detta i Supabase SQL Editor för att felsöka

-- 1. Kolla nuvarande policy:er
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
WHERE tablename IN ('companies', 'restaurant_staff', 'employee_accounts');

-- 2. Kolla om RLS är aktiverat
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('companies', 'restaurant_staff', 'employee_accounts');

-- 3. Testa auth.uid() funktion
-- Kör detta för att se vad auth.uid() returnerar
SELECT auth.uid() as current_uid;

-- 4. Kolla company_id typer i employee_accounts
SELECT 
    column_name, 
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'employee_accounts' 
AND column_name = 'company_id';

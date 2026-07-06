-- Temporär inaktivering av ALL RLS för att få systemet att fungera
-- Kör detta om Supabase auth-problem inte går att lösa snabbt

-- Inaktivera RLS på alla tabeller
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_accounts DISABLE ROW LEVEL SECURITY;

-- Verifiera att RLS är inaktiverat
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('companies', 'restaurant_staff', 'employee_accounts');

-- Nu ska allt fungera utan RLS
-- Testa employee login direkt

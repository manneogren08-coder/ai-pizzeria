-- Temporärt inaktivera RLS för testning
-- Kör detta om RLS-policy:erna inte fungerar

-- Inaktivera RLS på alla tabeller
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_accounts DISABLE ROW LEVEL SECURITY;

-- Verifiera att RLS är inaktiverat
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('companies', 'restaurant_staff', 'employee_accounts');

-- OBS: När allt fungerar, aktivera RLS igen med:
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE restaurant_staff ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employee_accounts ENABLE ROW LEVEL SECURITY;

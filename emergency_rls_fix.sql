-- Nödlösning om RLS fortfarande blockerar
-- Kör detta om inget annat fungerar

-- 1. Radera ALLA policy:er för employee_accounts
DROP POLICY IF EXISTS "Enable read access for users based on company_id" ON employee_accounts;
DROP POLICY IF EXISTS "Enable insert access for users based on company_id" ON employee_accounts;
DROP POLICY IF EXISTS "Enable update access for users based on company_id" ON employee_accounts;
DROP POLICY IF EXISTS "Enable delete access for users based on company_id" ON employee_accounts;

-- 2. Skapa en super-enkel policy som tillåter allt (temporärt!)
CREATE POLICY "Temporarily allow all access to employee_accounts" ON employee_accounts
FOR ALL USING (true);

-- 3. Verifiera att policy:en skapats
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive
FROM pg_policies 
WHERE tablename = 'employee_accounts';

-- Om detta fungerar, är problemet RLS-relaterat
-- Om det fortfarande inte fungerar, är problemet något annat

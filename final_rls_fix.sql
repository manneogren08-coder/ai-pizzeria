-- Korrekt RLS-policy för employee_accounts (UUID company_id)
-- Radera gamla felaktiga policy:er
DROP POLICY IF EXISTS "Enable read access for users based on company_id" ON employee_accounts;
DROP POLICY IF EXISTS "Enable insert access for users based on company_id" ON employee_accounts;
DROP POLICY IF EXISTS "Enable update access for users based on company_id" ON employee_accounts;
DROP POLICY IF EXISTS "Enable delete access for users based on company_id" ON employee_accounts;

-- Skapa korrekta policy:er för UUID company_id
CREATE POLICY "Enable read access for users based on company_id" ON employee_accounts
FOR SELECT USING (
  company_id IN (SELECT id FROM companies WHERE id = company_id)
);

CREATE POLICY "Enable insert access for users based on company_id" ON employee_accounts
FOR INSERT WITH CHECK (
  company_id IN (SELECT id FROM companies WHERE id = company_id)
);

CREATE POLICY "Enable update access for users based on company_id" ON employee_accounts
FOR UPDATE USING (
  company_id IN (SELECT id FROM companies WHERE id = company_id)
);

CREATE POLICY "Enable delete access for users based on company_id" ON employee_accounts
FOR DELETE USING (
  company_id IN (SELECT id FROM companies WHERE id = company_id)
);

-- Verifiera att policy:erna skapats korrekt
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

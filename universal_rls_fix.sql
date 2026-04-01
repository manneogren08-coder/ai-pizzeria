-- Universell RLS-policy som fungerar för alla typer
-- Radera gamla policy:er
DROP POLICY IF EXISTS "Enable read access for users based on company_id" ON employee_accounts;
DROP POLICY IF EXISTS "Enable insert access for users based on company_id" ON employee_accounts;
DROP POLICY IF EXISTS "Enable update access for users based on company_id" ON employee_accounts;
DROP POLICY IF EXISTS "Enable delete access for users based on company_id" ON employee_accounts;

-- Universell policy med typkonvertering
CREATE POLICY "Enable read access for users based on company_id" ON employee_accounts
FOR SELECT USING (
  company_id::text = auth.uid()::text
);

CREATE POLICY "Enable insert access for users based on company_id" ON employee_accounts
FOR INSERT WITH CHECK (
  company_id::text = auth.uid()::text
);

CREATE POLICY "Enable update access for users based on company_id" ON employee_accounts
FOR UPDATE USING (
  company_id::text = auth.uid()::text
);

CREATE POLICY "Enable delete access for users based on company_id" ON employee_accounts
FOR DELETE USING (
  company_id::text = auth.uid()::text
);

-- Verifiera
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive
FROM pg_policies 
WHERE tablename = 'employee_accounts'
ORDER BY policyname;

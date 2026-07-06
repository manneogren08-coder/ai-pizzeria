-- Korrekt RLS-policy för employee_accounts
-- Ersätt befintliga policy:er med dessa

-- Radera gamla policy:er
DROP POLICY IF EXISTS "Users can view employee accounts for their company" ON employee_accounts;
DROP POLICY IF EXISTS "Users can manage employee accounts for their company" ON employee_accounts;
DROP POLICY IF EXISTS "Users can insert employee accounts for their company" ON employee_accounts;
DROP POLICY IF EXISTS "Users can update employee accounts for their company" ON employee_accounts;
DROP POLICY IF EXISTS "Users can delete employee accounts for their company" ON employee_accounts;

-- Skapa nya korrekta policy:er
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

-- Verifiera att policy:erna skapats
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
WHERE tablename = 'employee_accounts';

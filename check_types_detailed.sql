-- Detaljerad typ-koll för auth.uid() och company_id
SELECT 
    'auth.uid() type' as info,
    pg_typeof(auth.uid()) as auth_uid_type,
    'company_id type in employee_accounts' as info,
    data_type as company_id_type,
    udt_name as company_id_udt
FROM information_schema.columns 
WHERE table_name = 'employee_accounts' AND column_name = 'company_id';

-- Testa auth.uid() värde
SELECT 
    auth.uid() as current_uid,
    pg_typeof(auth.uid()) as uid_type;

-- Kolla befintliga company_id värder
SELECT 
    company_id,
    pg_typeof(company_id) as company_id_type
FROM employee_accounts 
LIMIT 3;

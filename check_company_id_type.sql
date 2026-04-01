-- Kolla datatyp för company_id i olika tabeller
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('companies', 'restaurant_staff', 'employee_accounts')
AND column_name = 'company_id'
ORDER BY table_name, column_name;

-- Kolla befintliga company_id värder
SELECT 'companies' as table_name, id as company_id, 'Sample company ID' as description
FROM companies 
LIMIT 1;

SELECT 'restaurant_staff' as table_name, company_id, 'Sample staff company_id' as description  
FROM restaurant_staff 
LIMIT 1;

SELECT 'employee_accounts' as table_name, company_id, 'Sample employee company_id' as description
FROM employee_accounts 
LIMIT 1;

-- Felsökning av roller och behörigheter
-- Kör detta för att se hela databasstrukturen

-- 1. Kolla alla tabeller som innehåller roller
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('restaurant_staff', 'role_permissions', 'companies', 'users')
AND (column_name LIKE '%role%' OR column_name LIKE '%email%')
ORDER BY table_name, column_name;

-- 2. Kolla restaurant_staff tabellen
SELECT 
    id,
    name,
    email,
    role,
    created_at,
    company_id
FROM restaurant_staff 
ORDER BY created_at DESC;

-- 3. Kolla role_permissions tabellen
SELECT 
    *
FROM role_permissions 
ORDER BY id;

-- 4. Kolla om det finns andra user-tabeller
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
AND (table_name LIKE '%user%' OR table_name LIKE '%staff%' OR table_name LIKE '%role%')
ORDER BY table_name;

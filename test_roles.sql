-- Testa roller och behörigheter i databasen
-- Kör detta för att se vad som finns i databasen

-- 1. Kolla befintlig personal och deras roller
SELECT 
    id,
    name,
    email,
    role,
    created_at,
    company_id
FROM restaurant_staff 
ORDER BY created_at DESC;

-- 2. Kolla om rollerna är korrekta
SELECT 
    role,
    COUNT(*) as count
FROM restaurant_staff 
GROUP BY role
ORDER BY role;

-- 3. Kolla company_id för att se om allt är korrekt
SELECT 
    id as company_id,
    name as company_name
FROM companies
ORDER BY id;

-- Felsökning av owner-roll
-- Kör detta för att se exakt vad som finns i databasen

-- 1. Kolla om manneboi08@gmail.com verkligen har owner-roll
SELECT 
    id,
    name,
    email,
    role,
    created_at,
    company_id
FROM restaurant_staff 
WHERE email = 'manneboi08@gmail.com';

-- 2. Kolla alla roller i systemet
SELECT 
    email,
    role,
    created_at
FROM restaurant_staff 
ORDER BY created_at DESC;

-- 3. Kolla company_id för att säkerställa rätt koppling
SELECT 
    id as company_id,
    name as company_name
FROM companies
ORDER BY id;

-- 4. Testa backend-logik manuellt
-- Simulera vad backend skulle hitta för manneboi08@gmail.com
SELECT 
    email,
    role,
    CASE 
        WHEN role = 'owner' THEN 'SHOULD GET OWNER ACCESS'
        WHEN role = 'member' THEN 'SHOULD GET MEMBER ACCESS'
        ELSE 'UNKNOWN ROLE'
    END as expected_access
FROM restaurant_staff 
WHERE email = 'manneboi08@gmail.com';

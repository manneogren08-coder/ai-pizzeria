-- Testa vad backend faktiskt skickar för roll
-- Kör detta för att se om rollen kommer fram

-- 1. Kolla om rollen finns i restaurant_staff
SELECT 
    id,
    name,
    email,
    role,
    created_at
FROM restaurant_staff 
WHERE email = 'manneboi08@gmail.com';

-- 2. Testa employee login manuellt (simulera backend-logik)
-- Detta visar vad backend skulle hitta
SELECT 
    email,
    role,
    'owner' as expected_role
FROM restaurant_staff 
WHERE email = 'manneboi08@gmail.com'
AND company_id = (SELECT id FROM companies LIMIT 1);

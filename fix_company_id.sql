-- Fixa company_id mismatch för manneboi08@gmail.com
-- Uppdatera restaurant_staff.company_id till rätt värde

-- 1. Kolla nuvarande company_id för manneboi08@gmail.com
SELECT 
    id,
    name,
    email,
    role,
    company_id,
    created_at
FROM restaurant_staff 
WHERE email = 'manneboi08@gmail.com';

-- 2. Kolla vilket company_id som ska användas
SELECT 
    id as correct_company_id,
    name as company_name
FROM companies 
WHERE id = (SELECT company_id FROM restaurant_staff WHERE email = 'manneboi08@gmail.com');

-- 3. Uppdatera company_id till rätt värde
UPDATE restaurant_staff 
SET company_id = (SELECT id FROM companies WHERE id = (SELECT company_id FROM restaurant_staff WHERE email = 'manneboi08@gmail.com'))
WHERE email = 'manneboi08@gmail.com';

-- 4. Verifiera att det blev korrekt
SELECT 
    'Uppdaterat' as status,
    id,
    name,
    email,
    role,
    company_id,
    created_at
FROM restaurant_staff 
WHERE email = 'manneboi08@gmail.com';

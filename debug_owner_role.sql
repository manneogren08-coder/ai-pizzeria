-- Debug owner role for manneboi08@gmail.com
-- Kolla om rollen är korrekt i databasen

SELECT 
    id,
    name,
    email,
    role,
    company_id,
    created_at
FROM restaurant_staff 
WHERE email = 'manneboi08@gmail.com';

-- Kolla om det finns flera staff members för samma company
SELECT 
    id,
    name,
    email,
    role,
    company_id,
    created_at
FROM restaurant_staff 
WHERE company_id = (
    SELECT company_id FROM restaurant_staff WHERE email = 'manneboi08@gmail.com'
)
ORDER BY id;

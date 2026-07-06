-- Lägg till role-kolumn i restaurant_staff
-- Kör detta för att fixa roll-systemet

-- 1. Lägg till role-kolumn om den inte finns
ALTER TABLE restaurant_staff 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';

-- 2. Sätt default värden för befintlig personal
UPDATE restaurant_staff 
SET role = 'member' 
WHERE role IS NULL;

-- 3. Sätt owner för manneboi08@gmail.com
UPDATE restaurant_staff 
SET role = 'owner' 
WHERE email = 'manneboi08@gmail.com';

-- 4. Sätt editor för den andra personalen (ersätt med rätt email)
-- UPDATE restaurant_staff 
-- SET role = 'editor' 
-- WHERE email = 'annan-email@exempel.com';

-- 5. Verifiera resultatet
SELECT 
    id,
    name,
    email,
    role,
    created_at
FROM restaurant_staff 
ORDER BY created_at DESC;

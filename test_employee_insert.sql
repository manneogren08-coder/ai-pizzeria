-- Testa att manuellt skapa employee account för att felsöka RLS
-- Kör detta i Supabase SQL Editor

-- 1. Kolla om du kan skapa employee account manuellt
INSERT INTO employee_accounts (
  company_id,
  email,
  display_name,
  one_time_code_hash,
  one_time_code_expires_at,
  created_at,
  updated_at
) 
SELECT 
  '1', -- company_id (ersätt med ditt company ID)
  'test@exempel.com', -- email
  'Test User', -- display_name
  'dummy_hash', -- one_time_code_hash
  NOW() + INTERVAL '10 minutes', -- one_time_code_expires_at
  NOW(), -- created_at
  NOW() -- updated_at
WHERE NOT EXISTS (
  SELECT 1 FROM employee_accounts 
  WHERE company_id = '1' AND email = 'test@exempel.com'
);

-- Om detta misslyckas med RLS error, är policy:en för restriktiv

-- 2. Kolla company_id typ i employee_accounts tabellen
SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'employee_accounts' 
AND column_name = 'company_id';

-- 3. Kolla om company_id är NULL i befintliga records
SELECT 
  id,
  company_id,
  email,
  display_name,
  created_at
FROM employee_accounts 
LIMIT 5;

-- 4. Testa auth.uid() direkt
SELECT auth.uid() as current_uid;

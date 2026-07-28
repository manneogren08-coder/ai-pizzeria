-- Remove the "editor" role from StaffGuide's permission system.
-- StaffGuide now has exactly three roles: owner, admin, member.
-- Run this once in the Supabase SQL Editor. Safe to re-run.

-- 1. Any staff currently on the "editor" role become "admin" automatically,
--    per the new 3-role model.
UPDATE restaurant_staff
SET role = 'admin'
WHERE role = 'editor';

-- 2. Replace the CHECK constraint on restaurant_staff.role so "editor" is no
--    longer an allowed value going forward.
ALTER TABLE restaurant_staff
  DROP CONSTRAINT IF EXISTS restaurant_staff_role_check;

ALTER TABLE restaurant_staff
  ADD CONSTRAINT restaurant_staff_role_check
  CHECK (role IN ('owner', 'admin', 'member'));

COMMENT ON COLUMN restaurant_staff.role IS 'User role: owner, admin, member';

-- 3. role_permissions is not currently read anywhere in the application
--    (all permission checks are hardcoded in the app code), but clean it up
--    too so no trace of "editor" remains in the schema.
DELETE FROM role_permissions WHERE role = 'editor';

ALTER TABLE role_permissions
  DROP CONSTRAINT IF EXISTS role_permissions_role_check;

ALTER TABLE role_permissions
  ADD CONSTRAINT role_permissions_role_check
  CHECK (role IN ('owner', 'admin', 'member'));

-- 4. Verify: this should show no remaining 'editor' rows and every former
--    editor should now read 'admin'.
SELECT id, name, email, role, company_id
FROM restaurant_staff
ORDER BY company_id, id;

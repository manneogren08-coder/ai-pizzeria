<<<<<<< HEAD
-- Add role column to restaurant_staff table
-- This implements the role-based access control system

-- First, check if the column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurant_staff' 
    AND column_name = 'role'
  ) THEN
    -- Add the role column with default value
    ALTER TABLE restaurant_staff 
    ADD COLUMN role VARCHAR(20) DEFAULT 'member';
    
    -- Add CHECK constraint for valid roles
    ALTER TABLE restaurant_staff 
    ADD CONSTRAINT restaurant_staff_role_check 
    CHECK (role IN ('owner', 'admin', 'editor', 'member'));
    
    -- Update existing records to have appropriate roles
    -- For now, set all existing staff to 'member' by default
    UPDATE restaurant_staff SET role = 'member' WHERE role IS NULL;
    
    -- Set the first staff member as owner (you can adjust this)
    UPDATE restaurant_staff 
    SET role = 'owner' 
    WHERE id = (
      SELECT MIN(id) FROM restaurant_staff 
      WHERE company_id = (
        SELECT MIN(id) FROM companies WHERE active = true
      )
    );
    
    RAISE NOTICE 'Role column added successfully to restaurant_staff table';
  ELSE
    RAISE NOTICE 'Role column already exists in restaurant_staff table';
  END IF;
END $$;

-- Verify the changes
SELECT 
  id, 
  name, 
  email, 
  role, 
  company_id, 
  created_at
FROM restaurant_staff 
ORDER BY company_id, id;
=======
-- Migration: Add role-based access control system
-- Run this in Supabase SQL Editor

-- 1. Add role column to restaurant_staff table
ALTER TABLE restaurant_staff 
ADD COLUMN role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'member'));

-- 2. Create role permissions table (optional for future extension)
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'member')),
    permission TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insert default permissions
INSERT INTO role_permissions (role, permission) VALUES
    ('owner', 'company_settings'),
    ('owner', 'password_management'),
    ('owner', 'staff_management'),
    ('owner', 'deactivate_company'),
    ('owner', 'full_admin_access'),
    
    ('admin', 'staff_management'),
    ('admin', 'content_management'),
    ('admin', 'prep_management'),
    ('admin', 'most_admin_access'),
    
    ('editor', 'recipes_edit'),
    ('editor', 'menu_edit'),
    ('editor', 'prep_edit'),
    ('editor', 'content_creation'),
    
    ('member', 'prep_view'),
    ('member', 'prep_complete'),
    ('member', 'ai_chat');

-- 4. Update existing staff to have appropriate roles
-- Set first staff member as owner, others as members
UPDATE restaurant_staff 
SET role = 'owner' 
WHERE id = (
    SELECT id FROM restaurant_staff 
    ORDER BY created_at ASC 
    LIMIT 1
);

-- Set any other existing staff as members
UPDATE restaurant_staff 
SET role = 'member' 
WHERE role IS NULL OR role = '';

-- 5. Create index for performance
CREATE INDEX idx_staff_company_role ON restaurant_staff(company_id, role);

-- 6. Add comment for documentation
COMMENT ON COLUMN restaurant_staff.role IS 'User role: owner, admin, editor, member';
>>>>>>> 319fddfc62c7d20576d5279b0b8b4b8f36d9e7d5

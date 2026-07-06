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

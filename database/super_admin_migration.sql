-- Super-admin migration for companies table
-- Adds super_admin_enabled and super_admin_password columns

DO $$
BEGIN
    -- Check if super_admin_enabled column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'super_admin_enabled'
    ) THEN
        -- Add super_admin_enabled column
        ALTER TABLE companies 
        ADD COLUMN super_admin_enabled BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added super_admin_enabled column to companies table';
    END IF;

    -- Check if super_admin_password column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'super_admin_password'
    ) THEN
        -- Add super_admin_password column
        ALTER TABLE companies 
        ADD COLUMN super_admin_password TEXT;
        
        RAISE NOTICE 'Added super_admin_password column to companies table';
    END IF;
END $$;

-- Verify changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN ('super_admin_enabled', 'super_admin_password')
ORDER BY column_name;

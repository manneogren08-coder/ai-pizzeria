# Role-Based Access Control Implementation Guide

## Overview
This guide documents the complete implementation of role-based access control (RBAC) for the Staffguide system.

## Database Schema

### 1. Role Column Addition
- Added `role` column to `restaurant_staff` table
- CHECK constraint ensures only valid roles: 'owner', 'admin', 'editor', 'member'
- Default value: 'member'

### 2. Migration Script
Location: `database/add_roles_migration.sql`

```sql
ALTER TABLE restaurant_staff 
ADD COLUMN role VARCHAR(20) DEFAULT 'member' 
CHECK (role IN ('owner', 'admin', 'editor', 'member'));
```

## Authentication & Authorization

### 1. EmployeeToken Interface
Updated to include role field:
```typescript
interface EmployeeToken {
  uid: string;
  companyId: string;
  employeeId: string;
  employeeEmail: string;
  isEmployee: boolean;
  role: 'owner' | 'admin' | 'editor' | 'member';
}
```

### 2. Permission System
Location: `lib/auth/permissions.ts`

#### Available Permissions:
- `manage_staff` - Manage staff members
- `manage_recipes` - Create/edit recipes
- `manage_menu` - Create/edit menu items
- `manage_prep` - Create/edit prep tasks
- `view_prep` - View prep tasks
- `update_prep_status` - Mark prep tasks as complete
- `view_stats` - View statistics
- `manage_security` - Security settings

#### Role Permissions:
- **Owner**: All permissions
- **Admin**: All except `manage_security`
- **Editor**: `manage_recipes`, `manage_menu`, `manage_prep`, `view_prep`, `update_prep_status`
- **Member**: `view_prep`, `update_prep_status`

### 3. Special Rules
- Members can only update specific fields in prep tasks (`is_done`, `completed_by`, `completed_at`)
- Only owners can assign owner role to others
- AI chat is available to all roles

## API Endpoints

### 1. Staff Role Management
Location: `pages/api/staff/[id].js`
- Method: `PATCH`
- Purpose: Update staff member role
- Requires: `manage_staff` permission
- Special rule: Only owner can assign owner role

### 2. Prep Task Updates
Location: `pages/api/prep/toggle.js`
- Method: `POST`
- Purpose: Update prep task completion status
- Requires: `update_prep_status` permission
- Special rule: Members can only update completion fields

## Frontend Navigation

### 1. Role-Based Navigation
Location: `lib/frontend/roleNavigation.js`

#### Navigation Items by Role:
- **Owner**: AI Chat, Recipes, Menu, Prep, Staff, Stats, Security
- **Admin**: AI Chat, Recipes, Menu, Prep, Staff, Stats
- **Editor**: AI Chat, Recipes, Menu, Prep
- **Member**: AI Chat, Prep

### 2. Admin Panel Tabs
Visible tabs based on role:
- **All roles**: `info`
- **Owner/Admin/Editor**: `menu`, `recipes`, `routines`
- **All roles**: `prep`
- **Owner/Admin**: `staff`, `stats`
- **Owner only**: `security`

## Admin Panel

### 1. Staff Management
Location: `app/(dashboard)/chef/personal/page.tsx`
- View all staff members
- Change staff roles
- Role descriptions and permissions
- Real-time updates

### 2. Role Management Features:
- Dropdown to change roles
- Visual role badges
- Permission descriptions
- Update confirmation

## Implementation Status

### Completed Components:
- [x] Database schema migration
- [x] Permission system
- [x] JWT token updates
- [x] API guards
- [x] Staff role management endpoint
- [x] Prep task special rules
- [x] Admin panel for staff management
- [x] Frontend navigation logic

### Testing Checklist:
- [ ] Database migration execution
- [ ] Role assignment functionality
- [ ] Permission enforcement in APIs
- [ ] Frontend navigation visibility
- [ ] Admin panel functionality
- [ ] Special rules for members
- [ ] AI chat accessibility for all roles

## Usage Instructions

### 1. Database Setup
```sql
-- Run the migration script
-- This will add the role column and set up constraints
```

### 2. Initial Role Assignment
```sql
-- Set first staff member as owner
UPDATE restaurant_staff 
SET role = 'owner' 
WHERE id = (SELECT MIN(id) FROM restaurant_staff);
```

### 3. Testing Roles
1. Log in as different roles
2. Verify navigation items
3. Test API permissions
4. Check admin panel access

### 4. Role Management
1. Access `/chef/personal` (admin+ only)
2. Use dropdown to change roles
3. Verify updates take effect immediately

## Security Considerations

### 1. Token Validation
- All API endpoints validate JWT tokens
- Role is extracted from token payload
- Permissions checked before action execution

### 2. Database Constraints
- CHECK constraint prevents invalid roles
- Company_id filtering ensures data isolation
- RLS policies should reference user role

### 3. Frontend Protection
- Navigation items filtered by role
- Admin tabs hidden based on permissions
- UI elements conditionally rendered

## Troubleshooting

### Common Issues:
1. **Role not showing in token**: Check JWT signing includes role
2. **Permission denied**: Verify role has required permission
3. **Navigation not updating**: Check frontend role state
4. **Database errors**: Ensure migration ran successfully

### Debug Steps:
1. Check JWT token payload
2. Verify database role column
3. Test permission functions
4. Check API endpoint logs

## Future Enhancements

### Potential Improvements:
1. Granular permissions system
2. Role inheritance
3. Temporary role assignments
4. Audit logging for role changes
5. Bulk role management
6. Role-based UI themes

### Security Enhancements:
1. Multi-factor authentication for admin actions
2. Session timeout based on role
3. IP restrictions for sensitive roles
4. Audit trail for permission changes

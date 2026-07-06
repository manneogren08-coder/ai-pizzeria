// Permission system for role-based access control
// JavaScript version for API compatibility

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin', 
  EDITOR: 'editor',
  MEMBER: 'member'
};

export const PERMISSIONS = {
  MANAGE_STAFF: 'manage_staff',
  MANAGE_RECIPES: 'manage_recipes',
  MANAGE_MENU: 'manage_menu',
  MANAGE_PREP: 'manage_prep',
  VIEW_PREP: 'view_prep',
  UPDATE_PREP_STATUS: 'update_prep_status',
  VIEW_STATS: 'view_stats',
  MANAGE_SECURITY: 'manage_security'
};

export const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: [
    PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.MANAGE_RECIPES,
    PERMISSIONS.MANAGE_MENU,
    PERMISSIONS.MANAGE_PREP,
    PERMISSIONS.VIEW_PREP,
    PERMISSIONS.UPDATE_PREP_STATUS,
    PERMISSIONS.VIEW_STATS,
    PERMISSIONS.MANAGE_SECURITY
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.MANAGE_RECIPES,
    PERMISSIONS.MANAGE_MENU,
    PERMISSIONS.MANAGE_PREP,
    PERMISSIONS.VIEW_PREP,
    PERMISSIONS.UPDATE_PREP_STATUS,
    PERMISSIONS.VIEW_STATS
  ],
  [ROLES.EDITOR]: [
    PERMISSIONS.MANAGE_RECIPES,
    PERMISSIONS.MANAGE_MENU,
    PERMISSIONS.MANAGE_PREP,
    PERMISSIONS.VIEW_PREP,
    PERMISSIONS.UPDATE_PREP_STATUS
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.VIEW_PREP,
    PERMISSIONS.UPDATE_PREP_STATUS
  ]
};

export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function requirePermission(role, permission) {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission} required for role ${role}`);
  }
}

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function canManageStaff(role) {
  return hasPermission(role, PERMISSIONS.MANAGE_STAFF);
}

export function canManageRecipes(role) {
  return hasPermission(role, PERMISSIONS.MANAGE_RECIPES);
}

export function canManageMenu(role) {
  return hasPermission(role, PERMISSIONS.MANAGE_MENU);
}

export function canManagePrep(role) {
  return hasPermission(role, PERMISSIONS.MANAGE_PREP);
}

export function canViewPrep(role) {
  return hasPermission(role, PERMISSIONS.VIEW_PREP);
}

export function canUpdatePrepStatus(role) {
  return hasPermission(role, PERMISSIONS.UPDATE_PREP_STATUS);
}

export function canViewStats(role) {
  return hasPermission(role, PERMISSIONS.VIEW_STATS);
}

export function canManageSecurity(role) {
  return hasPermission(role, PERMISSIONS.MANAGE_SECURITY);
}

// Special permissions for complex rules
export const SPECIAL_PERMISSIONS = {
  canUpdatePrepTask: (role, updateFields) => {
    if (role === 'member') {
      // Members can only update specific fields
      const allowedFields = ['is_done', 'updated_at'];
      return updateFields.every(field => allowedFields.includes(field));
    }
    // Other roles can update any field if they have manage_prep permission
    return hasPermission(role, PERMISSIONS.MANAGE_PREP);
  }
};

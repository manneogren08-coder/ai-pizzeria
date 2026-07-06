// Permission system for role-based access control
// This defines what each role can do in the Staffguide system

export type UserRole = 'owner' | 'admin' | 'editor' | 'member';

export interface Permission {
  action: string;
  resource: string;
  description: string;
}

// Define all available permissions
export const PERMISSIONS = {
  // Staff management
  MANAGE_STAFF: 'manage_staff',
  VIEW_STAFF: 'view_staff',
  
  // Recipe management
  MANAGE_RECIPES: 'manage_recipes',
  VIEW_RECIPES: 'view_recipes',
  
  // Menu management
  MANAGE_MENU: 'manage_menu',
  VIEW_MENU: 'view_menu',
  
  // Prep tasks management
  MANAGE_PREP: 'manage_prep',
  VIEW_PREP: 'view_prep',
  UPDATE_PREP_STATUS: 'update_prep_status',
  
  // Statistics and analytics
  VIEW_STATS: 'view_stats',
  
  // Security settings
  MANAGE_SECURITY: 'manage_security',
  
  // System-wide access
  ALL_ACCESS: 'all'
} as const;

// Role-based permission mapping
export const ROLE_PERMISSIONS = {
  owner: [
    PERMISSIONS.ALL_ACCESS
  ],
  admin: [
    PERMISSIONS.MANAGE_STAFF,
    PERMISSIONS.VIEW_STAFF,
    PERMISSIONS.MANAGE_RECIPES,
    PERMISSIONS.VIEW_RECIPES,
    PERMISSIONS.MANAGE_MENU,
    PERMISSIONS.VIEW_MENU,
    PERMISSIONS.MANAGE_PREP,
    PERMISSIONS.VIEW_PREP,
    PERMISSIONS.UPDATE_PREP_STATUS,
    PERMISSIONS.VIEW_STATS
  ],
  editor: [
    PERMISSIONS.MANAGE_RECIPES,
    PERMISSIONS.VIEW_RECIPES,
    PERMISSIONS.MANAGE_MENU,
    PERMISSIONS.VIEW_MENU,
    PERMISSIONS.MANAGE_PREP,
    PERMISSIONS.VIEW_PREP,
    PERMISSIONS.UPDATE_PREP_STATUS
  ],
  member: [
    PERMISSIONS.VIEW_PREP,
    PERMISSIONS.UPDATE_PREP_STATUS
  ]
} as const;

// Check if a role has permission for a specific action
export function hasPermission(role: UserRole, action: string): boolean {
  // Owner has all permissions
  if (role === 'owner') {
    return true;
  }
  
  // Check if the role has the specific permission
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions.includes(action as any);
}

// Check if a role can perform multiple actions
export function hasPermissions(role: UserRole, actions: string[]): boolean {
  return actions.every(action => hasPermission(role, action));
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole): string[] {
  if (role === 'owner') {
    return ['all'];
  }
  return ROLE_PERMISSIONS[role] || [];
}

// Special permission checks for specific scenarios
export const SPECIAL_PERMISSIONS = {
  // Members can only update specific fields in prep tasks
  canUpdatePrepTask: (role: UserRole, fields: string[]): boolean => {
    if (role === 'owner' || role === 'admin' || role === 'editor') {
      return true; // These roles can update any field
    }
    
    if (role === 'member') {
      // Members can only update these specific fields
      const allowedFields = ['is_done', 'completed_by', 'completed_at'];
      return fields.every(field => allowedFields.includes(field));
    }
    
    return false;
  },
  
  // Admin cannot change security settings (only owner can)
  canManageSecurity: (role: UserRole): boolean => {
    return role === 'owner';
  },
  
  // Check if role can access AI chat (all roles can)
  canAccessAI: (role: UserRole): boolean => {
    return true; // AI chat is available to all roles
  }
};

// Helper function to check permissions in API routes
export function requirePermission(role: UserRole, action: string) {
  if (!hasPermission(role, action)) {
    throw new Error(`Forbidden: Role '${role}' does not have permission '${action}'`);
  }
}

// Helper function to check special permissions
export function requireSpecialPermission(
  role: UserRole, 
  check: keyof typeof SPECIAL_PERMISSIONS, 
  ...args: any[]
) {
  const checker = SPECIAL_PERMISSIONS[check];
  if (!checker(role, ...args)) {
    throw new Error(`Forbidden: Role '${role}' does not have special permission '${check}'`);
  }
}

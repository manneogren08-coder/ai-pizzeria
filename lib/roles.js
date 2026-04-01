// Role-based access control system

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin', 
  EDITOR: 'editor',
  MEMBER: 'member'
};

export const PERMISSIONS = {
  // Company management
  COMPANY_SETTINGS: 'company_settings',
  PASSWORD_MANAGEMENT: 'password_management',
  DEACTIVATE_COMPANY: 'deactivate_company',
  
  // Staff management
  STAFF_MANAGEMENT: 'staff_management',
  
  // Content management
  RECIPES_EDIT: 'recipes_edit',
  MENU_EDIT: 'menu_edit',
  PREP_EDIT: 'prep_edit',
  CONTENT_CREATION: 'content_creation',
  
  // View access
  PREP_VIEW: 'prep_view',
  PREP_COMPLETE: 'prep_complete',
  
  // AI access (all roles have this)
  AI_CHAT: 'ai_chat'
};

// Define what each role can do
const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: [
    PERMISSIONS.COMPANY_SETTINGS,
    PERMISSIONS.PASSWORD_MANAGEMENT,
    PERMISSIONS.DEACTIVATE_COMPANY,
    PERMISSIONS.STAFF_MANAGEMENT,
    PERMISSIONS.RECIPES_EDIT,
    PERMISSIONS.MENU_EDIT,
    PERMISSIONS.PREP_EDIT,
    PERMISSIONS.CONTENT_CREATION,
    PERMISSIONS.PREP_VIEW,
    PERMISSIONS.PREP_COMPLETE,
    PERMISSIONS.AI_CHAT
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.STAFF_MANAGEMENT,
    PERMISSIONS.RECIPES_EDIT,
    PERMISSIONS.MENU_EDIT,
    PERMISSIONS.PREP_EDIT,
    PERMISSIONS.CONTENT_CREATION,
    PERMISSIONS.PREP_VIEW,
    PERMISSIONS.PREP_COMPLETE,
    PERMISSIONS.AI_CHAT
  ],
  [ROLES.EDITOR]: [
    PERMISSIONS.RECIPES_EDIT,
    PERMISSIONS.MENU_EDIT,
    PERMISSIONS.PREP_EDIT,
    PERMISSIONS.CONTENT_CREATION,
    PERMISSIONS.PREP_VIEW,
    PERMISSIONS.PREP_COMPLETE,
    PERMISSIONS.AI_CHAT
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.PREP_VIEW,
    PERMISSIONS.PREP_COMPLETE,
    PERMISSIONS.AI_CHAT
  ]
};

/**
 * Check if a user role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether user has permission
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Check if user can access admin panel
 * @param {string} role - User role
 * @returns {boolean} - Whether user can access admin
 */
export function canAccessAdmin(role) {
  return [ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR].includes(role);
}

/**
 * Check if user can manage staff
 * @param {string} role - User role
 * @returns {boolean} - Whether user can manage staff
 */
export function canManageStaff(role) {
  return [ROLES.OWNER, ROLES.ADMIN].includes(role);
}

/**
 * Check if user can edit content (recipes, menus, prep)
 * @param {string} role - User role
 * @returns {boolean} - Whether user can edit content
 */
export function canEditContent(role) {
  return [ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR].includes(role);
}

/**
 * Check if user can manage company settings
 * @param {string} role - User role
 * @returns {boolean} - Whether user can manage company
 */
export function canManageCompany(role) {
  return role === ROLES.OWNER;
}

/**
 * Middleware function to check permissions
 * @param {string} requiredPermission - Permission required
 * @returns {Function} - Middleware function
 */
export function requirePermission(requiredPermission) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ error: "No role found" });
    }
    
    if (!hasPermission(userRole, requiredPermission)) {
      return res.status(403).json({ 
        error: "Insufficient permissions",
        required: requiredPermission,
        role: userRole
      });
    }
    
    next();
  };
}

/**
 * Check if user can access prep tasks
 * @param {string} role - User role
 * @returns {boolean} - Whether user can access prep
 */
export function canAccessPrep(role) {
  return [ROLES.OWNER, ROLES.ADMIN, ROLES.EDITOR, ROLES.MEMBER].includes(role);
}

/**
 * Get user-friendly role name
 * @param {string} role - Role code
 * @returns {string} - User-friendly name
 */
export function getRoleName(role) {
  const roleNames = {
    [ROLES.OWNER]: 'Owner',
    [ROLES.ADMIN]: 'Admin', 
    [ROLES.EDITOR]: 'Editor',
    [ROLES.MEMBER]: 'Member'
  };
  return roleNames[role] || 'Unknown';
}

/**
 * Get role description
 * @param {string} role - Role code
 * @returns {string} - Role description
 */
export function getRoleDescription(role) {
  const descriptions = {
    [ROLES.OWNER]: 'Full administrativ tillgång till företaget',
    [ROLES.ADMIN]: 'Nästan full tillgång förutom lösenord och deaktivering',
    [ROLES.EDITOR]: 'Kan skapa och ändra recept, menyer och mise en places',
    [ROLES.MEMBER]: 'Kan se Mise en place och bocka uppgifter som klara'
  };
  return descriptions[role] || 'Ingen beskrivning';
}

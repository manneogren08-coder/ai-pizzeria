// Role-based navigation and UI visibility logic
// This determines what navigation items and UI elements are visible based on user role

export const ROLE_BASED_NAVIGATION = {
  owner: [
    { id: 'ai-chat', label: 'AI Chat', path: '/', icon: 'chat', alwaysVisible: true },
    { id: 'recipes', label: 'Recept', path: '/admin?tab=recipes', icon: 'book' },
    { id: 'menu', label: 'Meny', path: '/admin?tab=menu', icon: 'menu' },
    { id: 'prep', label: 'Prep', path: '/admin?tab=prep', icon: 'checklist' },
    { id: 'staff', label: 'Personal', path: '/admin?tab=staff', icon: 'users' },
    { id: 'stats', label: 'Statistik', path: '/admin?tab=stats', icon: 'chart' },
    { id: 'security', label: 'Säkerhet', path: '/admin?tab=security', icon: 'lock' }
  ],
  admin: [
    { id: 'ai-chat', label: 'AI Chat', path: '/', icon: 'chat', alwaysVisible: true },
    { id: 'recipes', label: 'Recept', path: '/admin?tab=recipes', icon: 'book' },
    { id: 'menu', label: 'Meny', path: '/admin?tab=menu', icon: 'menu' },
    { id: 'prep', label: 'Prep', path: '/admin?tab=prep', icon: 'checklist' },
    { id: 'staff', label: 'Personal', path: '/admin?tab=staff', icon: 'users' },
    { id: 'stats', label: 'Statistik', path: '/admin?tab=stats', icon: 'chart' }
  ],
  editor: [
    { id: 'ai-chat', label: 'AI Chat', path: '/', icon: 'chat', alwaysVisible: true },
    { id: 'recipes', label: 'Recept', path: '/admin?tab=recipes', icon: 'book' },
    { id: 'menu', label: 'Meny', path: '/admin?tab=menu', icon: 'menu' },
    { id: 'prep', label: 'Prep', path: '/admin?tab=prep', icon: 'checklist' }
  ],
  member: [
    { id: 'ai-chat', label: 'AI Chat', path: '/', icon: 'chat', alwaysVisible: true },
    { id: 'prep', label: 'Prep', path: '/admin?tab=prep', icon: 'checklist' }
  ]
};

// Get navigation items for a specific role
export function getNavigationItems(role) {
  return ROLE_BASED_NAVIGATION[role] || ROLE_BASED_NAVIGATION.member;
}

// Check if a user can access a specific admin tab
export function canAccessAdminTab(role, tabId) {
  const navigationItems = getNavigationItems(role);
  return navigationItems.some(item => item.id === tabId);
}

// Check if a user can see a specific UI element
export function canSeeUIElement(role, elementId) {
  switch (elementId) {
    case 'ai-chat':
      return true; // AI chat is available to all roles
    
    case 'recipes':
    case 'menu':
      return ['owner', 'admin', 'editor'].includes(role);
    
    case 'prep':
      return ['owner', 'admin', 'editor', 'member'].includes(role);
    
    case 'staff':
    case 'stats':
      return ['owner', 'admin'].includes(role);
    
    case 'security':
      return role === 'owner';
    
    case 'recipe-edit':
    case 'menu-edit':
      return ['owner', 'admin', 'editor'].includes(role);
    
    case 'prep-edit':
      return ['owner', 'admin', 'editor'].includes(role);
    
    case 'prep-complete':
      return ['owner', 'admin', 'editor', 'member'].includes(role);
    
    default:
      return false;
  }
}

// Get admin tabs that are visible for a role
export function getVisibleAdminTabs(role) {
  const allTabs = ['info', 'menu', 'recipes', 'routines', 'prep', 'staff', 'security', 'stats'];
  
  return allTabs.filter(tab => {
    switch (tab) {
      case 'info':
        return true; // Basic info is visible to all logged-in users
      case 'menu':
      case 'recipes':
      case 'routines':
        return ['owner', 'admin', 'editor'].includes(role);
      case 'prep':
        return ['owner', 'admin', 'editor', 'member'].includes(role);
      case 'staff':
      case 'stats':
        return ['owner', 'admin'].includes(role);
      case 'security':
        return role === 'owner';
      default:
        return false;
    }
  });
}

// Check if a role can perform a specific action
export function canPerformAction(role, action) {
  const permissions = {
    owner: ['all'],
    admin: ['view_staff', 'edit_staff', 'view_stats', 'manage_recipes', 'manage_menu', 'manage_prep'],
    editor: ['manage_recipes', 'manage_menu', 'manage_prep'],
    member: ['view_prep', 'complete_prep']
  };
  
  if (role === 'owner') return true;
  return permissions[role]?.includes(action) || false;
}

// Get role display information
export function getRoleInfo(role) {
  const roleInfo = {
    owner: {
      label: 'Owner',
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
      description: 'Full access, including security settings'
    },
    admin: {
      label: 'Admin',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
      description: 'Full access except security settings'
    },
    editor: {
      label: 'Editor',
      color: '#10B981',
      bgColor: '#F0FDF4',
      description: 'Can manage recipes, menu, and prep tasks'
    },
    member: {
      label: 'Member',
      color: '#6B7280',
      bgColor: '#F9FAFB',
      description: 'Can view and complete prep tasks only'
    }
  };
  
  return roleInfo[role] || roleInfo.member;
}

// Helper function to filter navigation based on role
export function filterNavigationByRole(navigationItems, role) {
  return navigationItems.filter(item => {
    // Always show items marked as alwaysVisible
    if (item.alwaysVisible) return true;
    
    // Check if the role can access this item
    return canAccessAdminTab(role, item.id);
  });
}

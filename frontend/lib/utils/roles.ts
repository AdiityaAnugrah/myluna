export function getEffectiveRole(user?: { role?: string; isTestingMode?: boolean } | null) {
  return user?.isTestingMode ? 'SUPER_ADMIN' : user?.role || '';
}

export function isDevRole(role?: string | null) {
  return role === 'DEV';
}

export function isAdminRole(role?: string | null) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'DEV';
}

export function canProcessRole(role?: string | null) {
  return role === 'TCP' || isAdminRole(role);
}

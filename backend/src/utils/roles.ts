export const ADMIN_ORDER_ROLE = 'ADMIN_ORDER';

export function isAdminOrderRole(roleName?: string | null) {
  return String(roleName || '').toUpperCase() === ADMIN_ORDER_ROLE;
}

export function isUserLikeRole(roleName?: string | null) {
  const role = String(roleName || '').toUpperCase();
  return role === 'USER' || role === ADMIN_ORDER_ROLE;
}

export function rolesWithAdminOrder(roles: string[]) {
  const upperRoles = roles.map((role) => String(role).toUpperCase());
  return upperRoles.includes('USER') && !upperRoles.includes(ADMIN_ORDER_ROLE)
    ? [...roles, ADMIN_ORDER_ROLE]
    : roles;
}

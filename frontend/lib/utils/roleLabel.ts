export function formatRoleLabel(role?: string | { name?: string | null } | null) {
  const rawRole = typeof role === 'object' ? role?.name : role;
  const normalized = String(rawRole || '').toUpperCase();
  const labels: Record<string, string> = {
    USER: 'User',
    ADMIN_ORDER: 'Admin Order',
    TCP: 'PUSAT',
    ADMIN: 'Admin',
    SUPER_ADMIN: 'Super Admin',
    DEV: 'Dev',
    TESTING: 'Testing',
  };

  return labels[normalized] || rawRole || '-';
}

export function formatDisplayText(value: string) {
  return value.replace(/\bTCP\b/g, 'PUSAT');
}

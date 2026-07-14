export const MENU_CATALOG = [
  { key: 'dashboard', path: '/dashboard', label: 'Dashboard', section: 'top' },
  { key: 'owner-home', path: '/inicio', label: 'Inicio', section: 'owner' },
  { key: 'my-reservations', path: '/mis-reservas', label: 'Mis reservas', section: 'owner' },
  { key: 'my-account', path: '/mi-cuenta', label: 'Mi estado de cuenta', section: 'owner' },
  { key: 'estructuras', path: '/estructuras', label: 'Configuración de estructura', section: 'admin' },
  { key: 'owners', path: '/owners', label: 'Propietarios', section: 'admin' },
  { key: 'residents', path: '/residents', label: 'Residentes', section: 'admin' },
  { key: 'finance-grid', path: '/finance/grid', label: 'Cuadro mensual', section: 'finance' },
  { key: 'finance', path: '/finance', label: 'Cuotas y pagos', section: 'finance' },
  { key: 'account-statement', path: '/finance', label: 'Estado de cuenta', section: 'owner' },
  { key: 'expenses', path: '/expenses', label: 'Gastos', section: 'finance' },
  { key: 'reports', path: '/reports', label: 'Reportes', section: 'finance' },
  { key: 'reservations', path: '/reservations', label: 'Reservas', section: 'operations' },
  { key: 'maintenance', path: '/maintenance', label: 'Mantenimiento', section: 'operations' },
  { key: 'helpdesk', path: '/helpdesk', label: 'Mesa de ayuda', section: 'operations' },
  { key: 'settings', path: '/settings', label: 'Configuración', section: 'bottom' },
  { key: 'role-menus', path: '/settings/roles', label: 'Accesos por rol', section: 'bottom' },
  { key: 'tenants', path: '/tenants', label: 'Empresas clientes', section: 'system' },
  { key: 'users', path: '/users', label: 'Usuarios', section: 'system' },
] as const

export type MenuKey = (typeof MENU_CATALOG)[number]['key']

export const ALL_MENU_KEYS = MENU_CATALOG.map((m) => m.key)

const ADMIN_FULL = ALL_MENU_KEYS.filter(
  (k) => !['account-statement', 'tenants', 'owner-home', 'my-reservations', 'my-account'].includes(k),
)
const ADMIN_GENERAL = [...ALL_MENU_KEYS.filter(
  (k) => !['account-statement', 'owner-home', 'my-reservations', 'my-account'].includes(k),
)]

export const DEFAULT_MENU_BY_ROLE: Record<string, MenuKey[]> = {
  ADMIN_GENERAL,
  ADMIN: ADMIN_FULL,
  ADMINISTRADOR: [
    'dashboard',
    'estructuras',
    'owners',
    'residents',
    'finance-grid',
    'finance',
    'expenses',
    'reports',
    'reservations',
    'maintenance',
    'helpdesk',
    'settings',
    'role-menus',
    'users',
  ],
  PROPIETARIO: ['owner-home', 'my-reservations', 'my-account'],
  RESIDENTE: ['owner-home', 'my-reservations'],
}

export function resolveRoleMenuAccess (
  roleCode: string,
  stored: unknown,
): MenuKey[] {
  let keys: MenuKey[]
  if (Array.isArray(stored) && stored.length) {
    keys = stored.filter((k): k is MenuKey => ALL_MENU_KEYS.includes(k as MenuKey))
  } else {
    keys = DEFAULT_MENU_BY_ROLE[roleCode] ?? DEFAULT_MENU_BY_ROLE.RESIDENTE
  }
  return normalizeLegacyOwnerMenus(roleCode, keys)
}

function normalizeLegacyOwnerMenus (roleCode: string, keys: MenuKey[]): MenuKey[] {
  if (roleCode !== 'PROPIETARIO' && roleCode !== 'RESIDENTE') return keys
  const set = new Set(keys)
  if (set.has('reservations' as MenuKey)) {
    set.delete('reservations' as MenuKey)
    set.add('my-reservations')
  }
  if (set.has('account-statement' as MenuKey)) {
    set.delete('account-statement' as MenuKey)
    set.add('my-account')
  }
  if (!set.has('owner-home') && (set.has('my-reservations') || set.has('my-account'))) {
    set.add('owner-home')
  }
  return [...set]
}

export function resolveUserMenuAccess (
  roles: { code: string; menuAccess: unknown }[],
): MenuKey[] {
  const keys = new Set<MenuKey>()
  for (const role of roles) {
    for (const key of resolveRoleMenuAccess(role.code, role.menuAccess)) {
      keys.add(key)
    }
  }
  return [...keys]
}

export function pathToMenuKeys (path: string): MenuKey[] {
  const normalized = path.split('?')[0].replace(/\/$/, '') || '/'
  return MENU_CATALOG
    .filter((m) => normalized === m.path || normalized.startsWith(`${m.path}/`))
    .map((m) => m.key)
}

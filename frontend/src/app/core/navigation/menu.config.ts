export interface MenuCatalogItem {
  key: string
  path: string
  label: string
  section: string
}

export const MENU_CATALOG: MenuCatalogItem[] = [
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
]

export const MENU_SECTION_LABELS: Record<string, string> = {
  top: 'Principal',
  admin: 'Administración',
  finance: 'Finanzas',
  owner: 'Propietario',
  operations: 'Operaciones',
  bottom: 'Sistema',
  system: 'Plataforma',
}

export function pathToMenuKeys (path: string): string[] {
  const normalized = path.split('?')[0].replace(/\/$/, '') || '/'
  return MENU_CATALOG
    .filter((m) => normalized === m.path || normalized.startsWith(`${m.path}/`))
    .map((m) => m.key)
}

export function menuKeyToPath (key: string): string | undefined {
  return MENU_CATALOG.find((m) => m.key === key)?.path
}

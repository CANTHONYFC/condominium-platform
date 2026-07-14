import type { PrismaClient } from '../../generated/prisma'
import { DEFAULT_MENU_BY_ROLE } from '../../src/common/constants/menu-access'

export const SYSTEM_ROLE_CODES = [
  'ADMIN_GENERAL',
  'ADMIN',
  'ADMINISTRADOR',
  'PROPIETARIO',
  'RESIDENTE',
] as const

const ROLE_DEFINITIONS: Record<string, { name: string; description: string }> = {
  ADMIN_GENERAL: { name: 'Administrador general', description: 'Control total de la empresa' },
  ADMIN: { name: 'Admin', description: 'Administración operativa completa' },
  ADMINISTRADOR: { name: 'Administrador', description: 'Gestión del condominio/edificio' },
  PROPIETARIO: { name: 'Propietario', description: 'Portal propietario' },
  RESIDENTE: { name: 'Residente', description: 'Portal residente' },
}

const RESIDENTE = ['dashboard:read', 'reservations:read', 'reservations:create', 'reservations:update', 'documents:read']
const PROPIETARIO = [...RESIDENTE, 'finance:read']
const ADMINISTRADOR = [
  'dashboard:read', 'condominiums:read', 'condominiums:update', 'owners:read', 'owners:create', 'owners:update',
  'residents:read', 'residents:create', 'residents:update', 'units:read', 'units:update',
  'finance:read', 'finance:create', 'finance:update', 'billing:read', 'billing:create', 'billing:update',
  'reservations:read', 'reservations:create', 'reservations:update', 'reservations:delete',
  'calendar:read', 'calendar:create', 'calendar:update', 'helpdesk:read', 'communications:read',
  'users:read', 'users:create', 'users:update', 'roles:read', 'roles:update', 'exports:read', 'exports:create', 'reports:read', 'settings:read',
]
const ADMIN = [
  ...ADMINISTRADOR,
  'condominiums:create', 'condominiums:delete', 'owners:delete', 'residents:delete',
  'units:create', 'units:delete', 'finance:delete', 'calendar:delete', 'users:delete',
  'roles:create', 'roles:update', 'settings:update', 'documents:create',
]

function permissionsFor (code: string, all: string[], isPlatform: boolean) {
  if (code === 'ADMIN_GENERAL') {
    return isPlatform ? all : all.filter((c) => !c.startsWith('tenants:'))
  }
  if (code === 'ADMIN') return ADMIN.filter((c) => all.includes(c))
  if (code === 'ADMINISTRADOR') return ADMINISTRADOR.filter((c) => all.includes(c))
  if (code === 'PROPIETARIO') return PROPIETARIO.filter((c) => all.includes(c))
  return RESIDENTE.filter((c) => all.includes(c))
}

export async function seedSystemRoles (
  prisma: PrismaClient,
  tenantId: string,
  isPlatform = false,
) {
  const allPermissions = await prisma.permission.findMany()
  const byCode = new Map(allPermissions.map((p) => [p.code, p.id]))

  for (const code of SYSTEM_ROLE_CODES) {
    const def = ROLE_DEFINITIONS[code]
    const permissionCodes = permissionsFor(code, allPermissions.map((p) => p.code), isPlatform)

    const role = await prisma.role.upsert({
      where: { tenantId_code: { tenantId, code } },
      update: {
        name: def.name,
        description: def.description,
        isSystem: true,
        menuAccess: DEFAULT_MENU_BY_ROLE[code] ?? [],
      },
      create: {
        tenantId,
        code,
        name: def.name,
        description: def.description,
        isSystem: true,
        menuAccess: DEFAULT_MENU_BY_ROLE[code] ?? [],
      },
    })

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    for (const permCode of permissionCodes) {
      const permissionId = byCode.get(permCode)
      if (permissionId) {
        await prisma.rolePermission.create({ data: { roleId: role.id, permissionId } })
      }
    }
  }
}

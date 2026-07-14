import { Injectable } from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { DEFAULT_MENU_BY_ROLE } from '../constants/menu-access'

/** Roles del sistema — no eliminables */
export const SYSTEM_ROLE_CODES = [
  'ADMIN_GENERAL',
  'ADMIN',
  'ADMINISTRADOR',
  'PROPIETARIO',
  'RESIDENTE',
] as const

export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number]

const ROLE_DEFINITIONS: Record<SystemRoleCode, { name: string; description: string }> = {
  ADMIN_GENERAL: {
    name: 'Administrador general',
    description: 'Control total de la empresa y usuarios',
  },
  ADMIN: {
    name: 'Admin',
    description: 'Administración completa operativa',
  },
  ADMINISTRADOR: {
    name: 'Administrador',
    description: 'Gestión del condominio o edificio',
  },
  RESIDENTE: {
    name: 'Residente',
    description: 'Portal residente: reservas y consultas',
  },
  PROPIETARIO: {
    name: 'Propietario',
    description: 'Portal propietario: reservas, documentos y estado de cuenta',
  },
}

const RESIDENTE_PERMISSIONS = [
  'dashboard:read',
  'reservations:read',
  'reservations:create',
  'reservations:update',
  'documents:read',
]

const PROPIETARIO_PERMISSIONS = [
  'dashboard:read',
  'reservations:read',
  'reservations:create',
  'reservations:update',
  'documents:read',
  'finance:read',
]

const ADMINISTRADOR_PERMISSIONS = [
  'dashboard:read',
  'condominiums:read',
  'condominiums:update',
  'owners:read',
  'owners:create',
  'owners:update',
  'residents:read',
  'residents:create',
  'residents:update',
  'units:read',
  'units:update',
  'finance:read',
  'finance:create',
  'finance:update',
  'billing:read',
  'billing:create',
  'billing:update',
  'reservations:read',
  'reservations:create',
  'reservations:update',
  'reservations:delete',
  'calendar:read',
  'calendar:create',
  'calendar:update',
  'helpdesk:read',
  'communications:read',
  'users:read',
  'users:create',
  'users:update',
  'roles:read',
  'roles:update',
  'exports:read',
  'exports:create',
  'reports:read',
  'settings:read',
]

const ADMIN_PERMISSIONS = [
  ...ADMINISTRADOR_PERMISSIONS,
  'condominiums:create',
  'condominiums:delete',
  'owners:delete',
  'residents:delete',
  'units:create',
  'units:delete',
  'finance:delete',
  'billing:delete',
  'calendar:delete',
  'users:delete',
  'roles:create',
  'roles:update',
  'settings:update',
  'staff:read',
  'incidents:read',
  'visits:read',
  'vehicles:read',
  'correspondence:read',
  'inventory:read',
  'purchases:read',
  'contracts:read',
  'surveys:read',
  'documents:create',
]

@Injectable()
export class TenantBootstrapService {
  constructor (private readonly prisma: PrismaService) {}

  async seedSystemRoles (tenantId: string, options?: { isPlatform?: boolean }) {
    const allPermissions = await this.prisma.permission.findMany()
    const byCode = new Map(allPermissions.map((p) => [p.code, p.id]))
    const isPlatform = options?.isPlatform ?? false

    for (const code of SYSTEM_ROLE_CODES) {
      const def = ROLE_DEFINITIONS[code]
      const permissionCodes = this.permissionsForRole(
        code,
        allPermissions.map((p) => p.code),
        isPlatform,
      )

      const role = await this.prisma.role.upsert({
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

      await this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } })

      for (const permCode of permissionCodes) {
        const permissionId = byCode.get(permCode)
        if (!permissionId) continue
        await this.prisma.rolePermission.create({
          data: { roleId: role.id, permissionId },
        })
      }
    }
  }

  async assignRoleToUser (tenantId: string, userId: string, roleCode: SystemRoleCode) {
    const role = await this.prisma.role.findFirst({
      where: { tenantId, code: roleCode, deletedAt: null },
    })
    if (!role) return

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    })
  }

  private permissionsForRole (
    code: SystemRoleCode,
    allCodes: string[],
    isPlatform: boolean,
  ): string[] {
    if (code === 'ADMIN_GENERAL') {
      return isPlatform
        ? allCodes
        : allCodes.filter((c) => !c.startsWith('tenants:'))
    }
    if (code === 'ADMIN') return ADMIN_PERMISSIONS.filter((c) => allCodes.includes(c))
    if (code === 'ADMINISTRADOR') {
      return ADMINISTRADOR_PERMISSIONS.filter((c) => allCodes.includes(c))
    }
    if (code === 'PROPIETARIO') {
      return PROPIETARIO_PERMISSIONS.filter((c) => allCodes.includes(c))
    }
    return RESIDENTE_PERMISSIONS.filter((c) => allCodes.includes(c))
  }
}

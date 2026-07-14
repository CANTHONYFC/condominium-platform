import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { SYSTEM_ROLE_CODES } from '../../common/services/tenant-bootstrap.service'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import {
  ALL_MENU_KEYS,
  DEFAULT_MENU_BY_ROLE,
  MENU_CATALOG,
  resolveRoleMenuAccess,
  type MenuKey,
} from '../../common/constants/menu-access'
import { CreateRoleDto, UpdateRoleDto } from '../users/dto/user.dto'

@Injectable()
export class RolesService {
  constructor (private readonly prisma: PrismaService) {}

  async findAll (tenantId: string, query: PaginationQueryDto) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = { tenantId, deletedAt: null }

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isSystem: 'desc' }, { code: 'asc' }],
        include: {
          rolePermissions: { include: { permission: true } },
          _count: { select: { userRoles: true } },
        },
      }),
      this.prisma.role.count({ where }),
    ])

    return buildPaginatedResult(
      data.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        usersCount: r._count.userRoles,
        permissions: r.rolePermissions.map((rp) => rp.permission.code),
        menuAccess: resolveRoleMenuAccess(r.code, r.menuAccess),
      })),
      total,
      page,
      limit,
    )
  }

  async create (tenantId: string, dto: CreateRoleDto) {
    if (SYSTEM_ROLE_CODES.includes(dto.code as never)) {
      throw new BadRequestException('Ese código está reservado para roles del sistema')
    }

    const existing = await this.prisma.role.findFirst({
      where: { tenantId, code: dto.code, deletedAt: null },
    })
    if (existing) throw new BadRequestException('Ya existe un rol con ese código')

    const role = await this.prisma.role.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        isSystem: false,
      },
    })

    await this.syncPermissions(role.id, dto.permissionCodes)
    return this.findOne(tenantId, role.id)
  }

  async update (tenantId: string, id: string, dto: UpdateRoleDto) {
    const role = await this.assertRole(tenantId, id)
    if (role.isSystem) {
      throw new BadRequestException('Los roles del sistema no se pueden modificar')
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
    })

    if (dto.permissionCodes) {
      await this.syncPermissions(id, dto.permissionCodes)
    }

    return this.findOne(tenantId, id)
  }

  async remove (tenantId: string, id: string) {
    const role = await this.assertRole(tenantId, id)
    if (role.isSystem) {
      throw new BadRequestException('Los roles del sistema no se pueden eliminar')
    }

    const inUse = await this.prisma.userRole.count({ where: { roleId: id } })
    if (inUse > 0) {
      throw new BadRequestException('El rol tiene usuarios asignados')
    }

    return this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async findOne (tenantId: string, id: string) {
    const role = await this.assertRole(tenantId, id)
    const perms = await this.prisma.rolePermission.findMany({
      where: { roleId: id },
      include: { permission: true },
    })
    return {
      ...role,
      permissions: perms.map((p) => p.permission.code),
      menuAccess: resolveRoleMenuAccess(role.code, role.menuAccess),
    }
  }

  getMenuCatalog () {
    return MENU_CATALOG
  }

  async updateMenuAccess (tenantId: string, id: string, menuKeys: string[]) {
    const role = await this.assertRole(tenantId, id)
    const valid = menuKeys.filter((k): k is MenuKey => ALL_MENU_KEYS.includes(k as MenuKey))
    if (!valid.length) {
      throw new BadRequestException('Selecciona al menos un menú')
    }

    await this.prisma.role.update({
      where: { id },
      data: { menuAccess: valid },
    })

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      menuAccess: resolveRoleMenuAccess(role.code, valid),
    }
  }

  async resetMenuAccess (tenantId: string, id: string) {
    const role = await this.assertRole(tenantId, id)
    const defaults = DEFAULT_MENU_BY_ROLE[role.code] ?? DEFAULT_MENU_BY_ROLE.RESIDENTE

    await this.prisma.role.update({
      where: { id },
      data: { menuAccess: defaults },
    })

    return {
      id: role.id,
      code: role.code,
      menuAccess: defaults,
    }
  }

  private async assertRole (tenantId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
    if (!role) throw new NotFoundException('Rol no encontrado')
    return role
  }

  private async syncPermissions (roleId: string, codes: string[]) {
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: codes } },
    })
    await this.prisma.rolePermission.deleteMany({ where: { roleId } })
    for (const p of permissions) {
      await this.prisma.rolePermission.create({
        data: { roleId, permissionId: p.id },
      })
    }
  }
}

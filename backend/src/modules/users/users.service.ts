import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantBootstrapService } from '../../common/services/tenant-bootstrap.service'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import { CreateUserDto, UpdateUserDto } from './dto/user.dto'
import { UserStatus } from '../../../generated/prisma'

@Injectable()
export class UsersService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly bootstrap: TenantBootstrapService,
  ) {}

  async findAll (tenantId: string, query: PaginationQueryDto) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = { tenantId, deletedAt: null }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            include: { role: { select: { id: true, code: true, name: true, isSystem: true } } },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ])

    return buildPaginatedResult(
      data.map((u) => ({
        ...u,
        roles: u.userRoles.map((ur) => ur.role),
        userRoles: undefined,
      })),
      total,
      page,
      limit,
    )
  }

  async findOne (tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    })
    if (!user) throw new NotFoundException('Usuario no encontrado')
    return {
      ...user,
      roles: user.userRoles.map((ur) => ur.role),
    }
  }

  async create (tenantId: string, dto: CreateUserDto) {
    await this.assertUserQuota(tenantId)

    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email, deletedAt: null },
    })
    if (existing) throw new BadRequestException('El email ya está registrado en esta empresa')

    const role = await this.prisma.role.findFirst({
      where: { tenantId, code: dto.roleCode, deletedAt: null },
    })
    if (!role) throw new BadRequestException(`Rol "${dto.roleCode}" no existe`)

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: dto.status ?? 'ACTIVE',
      },
    })

    await this.prisma.userRole.create({
      data: { userId: user.id, roleId: role.id },
    })

    return this.findOne(tenantId, user.id)
  }

  async update (tenantId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(tenantId, id)

    const data: Record<string, unknown> = {}
    if (dto.firstName) data.firstName = dto.firstName
    if (dto.lastName) data.lastName = dto.lastName
    if (dto.phone !== undefined) data.phone = dto.phone
    if (dto.status) data.status = dto.status
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12)

    await this.prisma.user.update({ where: { id }, data })

    if (dto.roleCode) {
      const role = await this.prisma.role.findFirst({
        where: { tenantId, code: dto.roleCode, deletedAt: null },
      })
      if (!role) throw new BadRequestException(`Rol "${dto.roleCode}" no existe`)
      await this.prisma.userRole.deleteMany({ where: { userId: id } })
      await this.prisma.userRole.create({ data: { userId: id, roleId: role.id } })
    }

    return this.findOne(tenantId, id)
  }

  async setStatus (tenantId: string, id: string, status: UserStatus) {
    await this.findOne(tenantId, id)
    return this.prisma.user.update({
      where: { id },
      data: { status },
    })
  }

  async remove (tenantId: string, id: string) {
    await this.findOne(tenantId, id)
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    })
  }

  async countActive (tenantId: string) {
    return this.prisma.user.count({
      where: { tenantId, deletedAt: null, status: { not: 'INACTIVE' } },
    })
  }

  private async assertUserQuota (tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } })
    if (!tenant) throw new NotFoundException('Empresa no encontrada')

    const count = await this.countActive(tenantId)
    if (count >= tenant.maxUsers) {
      throw new ForbiddenException(
        `Límite de usuarios alcanzado (${tenant.maxUsers}). Contacte al administrador general.`,
      )
    }
  }
}

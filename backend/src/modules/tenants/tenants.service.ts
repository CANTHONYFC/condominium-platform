import { Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantBootstrapService } from '../../common/services/tenant-bootstrap.service'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import { UsersService } from '../users/users.service'
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto'

@Injectable()
export class TenantsService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly bootstrap: TenantBootstrapService,
    private readonly usersService: UsersService,
  ) {}

  async findAll (query: PaginationQueryDto) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = { deletedAt: null }

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, condominiums: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ])

    return buildPaginatedResult(
      data.map((t) => ({
        ...t,
        usersCount: t._count.users,
        condominiumsCount: t._count.condominiums,
        _count: undefined,
      })),
      total,
      page,
      limit,
    )
  }

  async findOne (id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { users: true, condominiums: true, roles: true } },
      },
    })
    if (!tenant) throw new NotFoundException('Tenant not found')
    return tenant
  }

  async create (dto: CreateTenantDto) {
    const code = await this.generateUniqueCode(dto.name)

    const tenant = await this.prisma.tenant.create({
      data: {
        code,
        name: dto.name,
        legalName: dto.legalName,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        maxUsers: dto.maxUsers ?? 10,
        organizationType: dto.organizationType ?? 'MANAGEMENT_FIRM',
      },
    })

    try {
      await this.bootstrap.seedSystemRoles(tenant.id, { isPlatform: false })

      const admin = await this.usersService.create(tenant.id, {
        email: dto.admin.email,
        password: dto.admin.password,
        firstName: dto.admin.firstName,
        lastName: dto.admin.lastName,
        phone: dto.admin.phone,
        roleCode: 'ADMIN_GENERAL',
      })

      return { ...tenant, adminUser: { id: admin.id, email: admin.email } }
    } catch (error) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { deletedAt: new Date(), isActive: false },
      })
      throw error
    }
  }

  async update (id: string, dto: UpdateTenantDto) {
    await this.findOne(id)
    return this.prisma.tenant.update({ where: { id }, data: dto })
  }

  async remove (id: string) {
    await this.findOne(id)
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })
  }

  private async generateUniqueCode (name: string): Promise<string> {
    const base = this.slugify(name)
    let code = base
    let counter = 1

    while (await this.prisma.tenant.findFirst({ where: { code } })) {
      code = `${base}-${counter}`
      counter += 1
    }

    return code
  }

  private slugify (value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'empresa'
  }
}

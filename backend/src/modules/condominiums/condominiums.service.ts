import { Injectable, NotFoundException } from '@nestjs/common'

import { OrganizationType, PropertyType } from '../../../generated/prisma'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { BaseRepository } from '../../common/repositories/base.repository'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { nextCorrelativeCode } from '../../common/utils/correlative-code'
import { CreateCondominiumDto, UpdateCondominiumDto } from './dto/condominium.dto'

@Injectable()
export class CondominiumsRepository extends BaseRepository {
  constructor (prisma: PrismaService) {
    super(prisma)
  }
}

@Injectable()
export class CondominiumsService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly repository: CondominiumsRepository,
  ) {}

  findAll (tenantId: string, query: PaginationQueryDto) {
    return this.repository.findPaginated('condominium', tenantId, query)
  }

  async findOne (tenantId: string, id: string) {
    const item = await this.prisma.condominium.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { towers: true, blocks: true },
    })
    if (!item) throw new NotFoundException('Condominium not found')
    return item
  }

  async create (tenantId: string, dto: CreateCondominiumDto, userId?: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } })
    const propertyType = this.resolvePropertyType(tenant?.organizationType, dto.propertyType)

    const code = await nextCorrelativeCode(this.prisma, {
      entity: 'condominium',
      tenantId,
      prefix: 'COND',
    })

    return this.prisma.condominium.create({
      data: { ...dto, code, propertyType, tenantId, createdById: userId },
    })
  }

  async update (tenantId: string, id: string, dto: UpdateCondominiumDto, userId?: string) {
    await this.findOne(tenantId, id)
    return this.prisma.condominium.update({
      where: { id },
      data: { ...dto, updatedById: userId },
    })
  }

  remove (tenantId: string, id: string) {
    return this.repository.softDelete('condominium', tenantId, id)
  }

  private resolvePropertyType (
    organizationType: OrganizationType | undefined,
    explicit?: PropertyType,
  ): PropertyType {
    if (organizationType === 'BUILDING') return 'BUILDING'
    if (organizationType === 'CONDOMINIUM') return 'CONDOMINIUM'
    return explicit ?? 'CONDOMINIUM'
  }
}

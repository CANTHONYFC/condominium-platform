import { Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'

@Injectable()
export class TenantScopeService {
  constructor (private readonly prisma: PrismaService) {}

  async assertCondominium (tenantId: string, condominiumId: string) {
    const condo = await this.prisma.condominium.findFirst({
      where: { id: condominiumId, tenantId, deletedAt: null },
    })
    if (!condo) throw new NotFoundException('Condominium not found')
    return condo
  }

  async assertUnit (tenantId: string, unitId: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, tenantId, deletedAt: null },
    })
    if (!unit) throw new NotFoundException('Unit not found')
    return unit
  }

  async assertOwner (tenantId: string, ownerId: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { id: ownerId, tenantId, deletedAt: null },
    })
    if (!owner) throw new NotFoundException('Owner not found')
    return owner
  }

  async assertResident (tenantId: string, residentId: string) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: residentId, tenantId, deletedAt: null },
    })
    if (!resident) throw new NotFoundException('Resident not found')
    return resident
  }
}

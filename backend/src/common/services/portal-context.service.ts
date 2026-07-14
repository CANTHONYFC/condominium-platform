import { ForbiddenException, Injectable } from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'

export interface PortalContext {
  residentId: string
  residentType: string
  unitId: string
  unitCode: string
  condominiumId: string
  condominiumName: string
  condominiumCode: string
  ownerId: string | null
}

@Injectable()
export class PortalContextService {
  constructor (private readonly prisma: PrismaService) {}

  async resolve (tenantId: string, userId: string): Promise<PortalContext> {
    const resident = await this.prisma.resident.findFirst({
      where: { userId, tenantId, deletedAt: null },
      include: {
        unit: {
          include: {
            ownerships: {
              where: { deletedAt: null, isPrimary: true },
              include: { owner: { select: { id: true } } },
              take: 1,
            },
          },
        },
      },
    })

    if (resident) {
      return this.buildFromResident(tenantId, resident)
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    })
    if (!user) {
      throw new ForbiddenException('Usuario no encontrado')
    }

    const owner = await this.prisma.owner.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        email: { equals: user.email, mode: 'insensitive' },
        ownerships: { some: { deletedAt: null } },
      },
      include: {
        ownerships: {
          where: { deletedAt: null },
          include: { unit: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          take: 1,
        },
      },
    })

    if (!owner?.ownerships[0]) {
      throw new ForbiddenException(
        'No tienes un departamento asociado. Contacta a la administración para vincular tu cuenta.',
      )
    }

    const unit = owner.ownerships[0].unit
    const linkedResident = await this.ensureResidentForOwner(tenantId, user, owner, unit.id)
    return this.buildFromResident(tenantId, {
      ...linkedResident,
      unit: {
        ...unit,
        ownerships: [{ owner: { id: owner.id } }],
      },
    })
  }

  private async ensureResidentForOwner (
    tenantId: string,
    user: { id: string; email: string; firstName: string; lastName: string; phone: string | null },
    owner: {
      documentType: string
      documentNumber: string
      email: string | null
      phone: string | null
      type: string
      firstName: string | null
      lastName: string | null
      legalName: string | null
    },
    unitId: string,
  ) {
    const existingOnUnit = await this.prisma.resident.findFirst({
      where: { userId: user.id, tenantId, unitId, deletedAt: null },
    })
    if (existingOnUnit) return existingOnUnit

    const firstName = owner.type === 'LEGAL'
      ? (owner.legalName ?? user.firstName)
      : (owner.firstName ?? user.firstName)
    const lastName = owner.type === 'LEGAL' ? '—' : (owner.lastName ?? user.lastName)

    return this.prisma.resident.create({
      data: {
        tenantId,
        unitId,
        type: 'OWNER',
        firstName,
        lastName,
        documentType: owner.documentType,
        documentNumber: owner.documentNumber,
        email: owner.email ?? user.email,
        phone: owner.phone ?? user.phone ?? undefined,
        isPrimary: true,
        userId: user.id,
        moveInDate: new Date(),
      },
    })
  }

  private async buildFromResident (
    tenantId: string,
    resident: {
      id: string
      type: string
      unitId: string
      unit: {
        code: string
        condominiumId: string
        ownerships: { owner: { id: string } }[]
      }
    },
  ): Promise<PortalContext> {
    const condo = await this.prisma.condominium.findFirst({
      where: { id: resident.unit.condominiumId, tenantId, deletedAt: null },
      select: { id: true, name: true, code: true },
    })

    return {
      residentId: resident.id,
      residentType: resident.type,
      unitId: resident.unitId,
      unitCode: resident.unit.code,
      condominiumId: resident.unit.condominiumId,
      condominiumName: condo?.name ?? '',
      condominiumCode: condo?.code ?? '',
      ownerId: resident.unit.ownerships[0]?.owner?.id ?? null,
    }
  }
}

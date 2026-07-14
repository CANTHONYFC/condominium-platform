import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantScopeService } from '../../common/services/tenant-scope.service'
import { TenantBootstrapService } from '../../common/services/tenant-bootstrap.service'
import { BaseRepository } from '../../common/repositories/base.repository'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import {
  AssignOwnershipDto,
  CreateOwnerDocumentDto,
  CreateOwnerDto,
  CreateOwnerHistoryDto,
  UpdateOwnerDto,
} from './dto/owner.dto'

@Injectable()
export class OwnersRepository extends BaseRepository {
  constructor (prisma: PrismaService) {
    super(prisma)
  }
}

@Injectable()
export class OwnersService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly scope: TenantScopeService,
    private readonly repository: OwnersRepository,
    private readonly bootstrap: TenantBootstrapService,
  ) {}

  findAll (tenantId: string, query: PaginationQueryDto) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = {
      tenantId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
              { legalName: { contains: query.search, mode: 'insensitive' as const } },
              { documentNumber: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    return Promise.all([
      this.prisma.owner.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { ownerships: true, documents: true } },
          ownerships: {
            where: { deletedAt: null },
            include: {
              unit: {
                include: {
                  floor: { include: { tower: true, block: true } },
                },
              },
            },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      }),
      this.prisma.owner.count({ where }),
    ]).then(([data, total]) => buildPaginatedResult(data, total, page, limit))
  }

  async findOne (tenantId: string, id: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        ownerships: {
          where: { deletedAt: null },
          include: {
            unit: {
              include: {
                floor: { include: { tower: true, block: true } },
              },
            },
          },
        },
        history: { orderBy: { createdAt: 'desc' }, take: 50 },
        documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!owner) throw new NotFoundException('Owner not found')
    return owner
  }

  async create (tenantId: string, dto: CreateOwnerDto) {
    const { unitId, password, createPortalAccess, ...ownerData } = dto

    if (unitId) {
      await this.assertUnitAvailable(tenantId, unitId)
    }

    const wantsPortal = createPortalAccess !== false && !!unitId
    if (wantsPortal) {
      if (!dto.email) throw new BadRequestException('Email requerido para acceso al portal')
      if (!password || password.length < 8) {
        throw new BadRequestException('Contraseña mínimo 8 caracteres')
      }
      await this.assertUserQuota(tenantId)
      await this.assertEmailAvailable(tenantId, dto.email)
      await this.ensurePropietarioRole(tenantId)
    }

    return this.prisma.$transaction(async (tx) => {
      const owner = await tx.owner.create({ data: { ...ownerData, tenantId } })
      await this.addHistory(tx, tenantId, owner.id, 'CREATED', 'Propietario registrado')

      if (unitId) {
        await this.createOwnershipInTx(tx, tenantId, owner.id, unitId)
        await this.addHistory(
          tx,
          tenantId,
          owner.id,
          'OWNERSHIP_ASSIGNED',
          'Departamento asignado al registrar',
        )

        if (wantsPortal && dto.email && password) {
          await this.createPortalAccessInTx(tx, tenantId, owner, unitId, password)
        }
      }

      return owner
    })
  }

  async update (tenantId: string, id: string, dto: UpdateOwnerDto) {
    await this.scope.assertOwner(tenantId, id)
    const owner = await this.prisma.owner.update({ where: { id }, data: dto })
    await this.addHistory(this.prisma, tenantId, id, 'UPDATED', 'Datos actualizados')
    return owner
  }

  remove (tenantId: string, id: string) {
    return this.repository.softDelete('owner', tenantId, id)
  }

  async assignOwnership (tenantId: string, ownerId: string, dto: AssignOwnershipDto) {
    await this.scope.assertOwner(tenantId, ownerId)
    await this.assertUnitAvailable(tenantId, dto.unitId)

    const owner = await this.prisma.owner.findFirst({
      where: { id: ownerId, tenantId, deletedAt: null },
    })
    if (!owner) throw new NotFoundException('Owner not found')

    const ownerHasPortal = await this.prisma.resident.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        userId: { not: null },
        type: 'OWNER',
        unit: { ownerships: { some: { ownerId, deletedAt: null } } },
      },
    })

    if (dto.password) {
      if (!owner.email) throw new BadRequestException('El propietario debe tener email')
      if (dto.password.length < 8) throw new BadRequestException('Contraseña mínimo 8 caracteres')
      if (ownerHasPortal) {
        throw new BadRequestException('Este propietario ya tiene acceso al portal')
      }
      await this.assertUserQuota(tenantId)
      await this.assertEmailAvailable(tenantId, owner.email)
      await this.ensurePropietarioRole(tenantId)
    }

    return this.prisma.$transaction(async (tx) => {
      const ownership = await this.createOwnershipInTx(
        tx,
        tenantId,
        ownerId,
        dto.unitId,
        dto.sharePercent,
        dto.isPrimary,
        dto.startDate,
      )

      if (dto.password && owner.email) {
        await this.createPortalAccessInTx(tx, tenantId, owner, dto.unitId, dto.password)
      }

      await this.addHistory(
        tx,
        tenantId,
        ownerId,
        'OWNERSHIP_ASSIGNED',
        `Unidad ${ownership.unit.code} asignada`,
      )

      return ownership
    })
  }

  async removeOwnership (tenantId: string, ownerId: string, ownershipId: string) {
    await this.scope.assertOwner(tenantId, ownerId)
    const ownership = await this.prisma.unitOwnership.findFirst({
      where: { id: ownershipId, ownerId, tenantId, deletedAt: null },
      include: { unit: true },
    })
    if (!ownership) throw new NotFoundException('Ownership not found')

    await this.prisma.$transaction(async (tx) => {
      await tx.unitOwnership.update({
        where: { id: ownershipId },
        data: { deletedAt: new Date(), endDate: new Date() },
      })

      const activeOwnerships = await tx.unitOwnership.count({
        where: { unitId: ownership.unitId, deletedAt: null },
      })
      const activeResidents = await tx.resident.count({
        where: { unitId: ownership.unitId, deletedAt: null },
      })

      if (activeOwnerships === 0 && activeResidents === 0) {
        await tx.unit.update({
          where: { id: ownership.unitId },
          data: { occupancyStatus: 'VACANT' },
        })
      }

      await this.addHistory(
        tx,
        tenantId,
        ownerId,
        'OWNERSHIP_REMOVED',
        `Unidad ${ownership.unit.code} removida`,
      )
    })

    return { removed: true }
  }

  getHistory (tenantId: string, ownerId: string, query: PaginationQueryDto) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = { tenantId, ownerId }
    return Promise.all([
      this.prisma.ownerHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ownerHistory.count({ where }),
    ]).then(([data, total]) => buildPaginatedResult(data, total, page, limit))
  }

  async addHistoryEntry (tenantId: string, ownerId: string, dto: CreateOwnerHistoryDto) {
    await this.scope.assertOwner(tenantId, ownerId)
    return this.addHistory(this.prisma, tenantId, ownerId, dto.event, dto.notes)
  }

  async addDocument (tenantId: string, ownerId: string, dto: CreateOwnerDocumentDto) {
    await this.scope.assertOwner(tenantId, ownerId)
    const doc = await this.prisma.document.create({
      data: { ...dto, tenantId, ownerId },
    })
    await this.addHistory(this.prisma, tenantId, ownerId, 'DOCUMENT_ADDED', dto.title)
    return doc
  }

  async listDocuments (tenantId: string, ownerId: string) {
    await this.scope.assertOwner(tenantId, ownerId)
    return this.prisma.document.findMany({
      where: { tenantId, ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async removeDocument (tenantId: string, ownerId: string, documentId: string) {
    await this.scope.assertOwner(tenantId, ownerId)
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, ownerId, tenantId, deletedAt: null },
    })
    if (!doc) throw new NotFoundException('Document not found')
    return this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    })
  }

  private async assertUnitAvailable (tenantId: string, unitId: string) {
    await this.scope.assertUnit(tenantId, unitId)
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, tenantId, deletedAt: null },
      include: {
        ownerships: { where: { deletedAt: null }, take: 1 },
      },
    })
    if (!unit) throw new NotFoundException('Unit not found')
    if (unit.occupancyStatus === 'UNDER_MAINTENANCE') {
      throw new BadRequestException('La unidad está en mantenimiento')
    }
    if (unit.ownerships.length > 0) {
      throw new BadRequestException('La unidad ya tiene propietario asignado')
    }
  }

  private async assertEmailAvailable (tenantId: string, email: string) {
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
    })
    if (existing) {
      throw new BadRequestException('Ya existe un usuario con ese correo')
    }
  }

  private async assertUserQuota (tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } })
    if (!tenant) return
    const count = await this.prisma.user.count({
      where: { tenantId, deletedAt: null, status: { not: 'INACTIVE' } },
    })
    if (count >= tenant.maxUsers) {
      throw new BadRequestException(
        `Límite de usuarios de la empresa alcanzado (${tenant.maxUsers})`,
      )
    }
  }

  private async createOwnershipInTx (
    tx: Pick<PrismaService, 'unitOwnership' | 'unit'>,
    tenantId: string,
    ownerId: string,
    unitId: string,
    sharePercent = 100,
    isPrimary = true,
    startDate?: string,
  ) {
    const ownership = await tx.unitOwnership.create({
      data: {
        tenantId,
        ownerId,
        unitId,
        sharePercent,
        isPrimary,
        startDate: startDate ? new Date(startDate) : new Date(),
      },
      include: { unit: true },
    })
    await tx.unit.update({
      where: { id: unitId },
      data: { occupancyStatus: 'OCCUPIED' },
    })
    return ownership
  }

  private async createPortalAccessInTx (
    tx: Pick<PrismaService, 'user' | 'resident' | 'userRole' | 'role'>,
    tenantId: string,
    owner: {
      id: string
      type: 'NATURAL' | 'LEGAL'
      email?: string | null
      phone?: string | null
      firstName?: string | null
      lastName?: string | null
      legalName?: string | null
      documentType: string
      documentNumber: string
    },
    unitId: string,
    password: string,
  ) {
    const email = owner.email!
    const passwordHash = await bcrypt.hash(password, 12)
    const firstName = owner.type === 'LEGAL'
      ? (owner.legalName ?? 'Propietario')
      : (owner.firstName ?? 'Propietario')
    const lastName = owner.type === 'LEGAL' ? '—' : (owner.lastName ?? '—')

    const user = await tx.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        firstName,
        lastName,
        phone: owner.phone ?? undefined,
        status: 'ACTIVE',
      },
    })

    const role = await tx.role.findFirst({
      where: { tenantId, code: 'PROPIETARIO', deletedAt: null },
    })
    if (!role) {
      throw new BadRequestException(
        'Rol PROPIETARIO no configurado. Ejecute la actualización de roles del tenant.',
      )
    }
    await tx.userRole.create({ data: { userId: user.id, roleId: role.id } })

    await tx.resident.create({
      data: {
        tenantId,
        unitId,
        type: 'OWNER',
        firstName,
        lastName,
        documentType: owner.documentType,
        documentNumber: owner.documentNumber,
        email,
        phone: owner.phone ?? undefined,
        isPrimary: true,
        userId: user.id,
        moveInDate: new Date(),
      },
    })
  }

  private async ensurePropietarioRole (tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: { tenantId, code: 'PROPIETARIO', deletedAt: null },
    })
    if (!role) {
      await this.bootstrap.seedSystemRoles(tenantId)
    }
  }

  private addHistory (
    tenantOrTx: PrismaService | Pick<PrismaService, 'ownerHistory'>,
    tenantId: string,
    ownerId: string,
    event: string,
    notes?: string,
  ) {
    return tenantOrTx.ownerHistory.create({
      data: { tenantId, ownerId, event, notes },
    })
  }
}

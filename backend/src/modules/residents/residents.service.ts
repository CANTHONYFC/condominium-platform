import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantScopeService } from '../../common/services/tenant-scope.service'
import { TenantBootstrapService } from '../../common/services/tenant-bootstrap.service'
import { BaseRepository } from '../../common/repositories/base.repository'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import {
  CreatePetDto,
  CreateResidentDocumentDto,
  CreateResidentDto,
  CreateResidentHistoryDto,
  UpdateResidentDto,
} from './dto/resident.dto'

@Injectable()
export class ResidentsRepository extends BaseRepository {
  constructor (prisma: PrismaService) {
    super(prisma)
  }
}

@Injectable()
export class ResidentsService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly scope: TenantScopeService,
    private readonly repository: ResidentsRepository,
    private readonly bootstrap: TenantBootstrapService,
  ) {}

  async findAll (tenantId: string, query: PaginationQueryDto, unitId?: string) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = {
      tenantId,
      deletedAt: null,
      ...(unitId ? { unitId } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
              { documentNumber: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.resident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          unit: { select: { id: true, code: true, condominiumId: true } },
          _count: { select: { pets: true } },
        },
      }),
      this.prisma.resident.count({ where }),
    ])
    return buildPaginatedResult(data, total, page, limit)
  }

  async findOne (tenantId: string, id: string) {
    const resident = await this.prisma.resident.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        unit: { include: { floor: true } },
        pets: { where: { deletedAt: null } },
        history: { orderBy: { createdAt: 'desc' }, take: 50 },
        documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!resident) throw new NotFoundException('Resident not found')
    return resident
  }

  async create (tenantId: string, dto: CreateResidentDto) {
    await this.scope.assertUnit(tenantId, dto.unitId)

    if (dto.createUserAccount) {
      if (!dto.email) throw new BadRequestException('Email requerido para crear usuario')
      if (!dto.password || dto.password.length < 8) {
        throw new BadRequestException('Contraseña mínimo 8 caracteres')
      }
      await this.assertUserQuota(tenantId)
    }

    let userId: string | undefined

    if (dto.createUserAccount && dto.email && dto.password) {
      const passwordHash = await bcrypt.hash(dto.password, 12)
      const user = await this.prisma.user.create({
        data: {
          tenantId,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          status: 'ACTIVE',
        },
      })
      await this.bootstrap.assignRoleToUser(tenantId, user.id, 'RESIDENTE')
      userId = user.id
    }

    const resident = await this.prisma.resident.create({
      data: {
        tenantId,
        unitId: dto.unitId,
        type: dto.type,
        firstName: dto.firstName,
        lastName: dto.lastName,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        email: dto.email,
        phone: dto.phone,
        isPrimary: dto.isPrimary ?? false,
        userId,
        moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : new Date(),
      },
      include: { unit: true, user: { select: { id: true, email: true, status: true } } },
    })
    await this.prisma.unit.update({
      where: { id: dto.unitId },
      data: { occupancyStatus: 'OCCUPIED' },
    })
    await this.addHistory(tenantId, resident.id, 'CREATED', 'Residente registrado')
    return resident
  }

  async update (tenantId: string, id: string, dto: UpdateResidentDto) {
    await this.scope.assertResident(tenantId, id)
    const resident = await this.prisma.resident.update({
      where: { id },
      data: {
        ...dto,
        moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : undefined,
        moveOutDate: dto.moveOutDate ? new Date(dto.moveOutDate) : undefined,
      },
    })
    if (dto.moveOutDate) {
      await this.addHistory(tenantId, id, 'MOVE_OUT', 'Residente se retiró de la unidad')
    } else {
      await this.addHistory(tenantId, id, 'UPDATED', 'Datos actualizados')
    }
    return resident
  }

  remove (tenantId: string, id: string) {
    return this.repository.softDelete('resident', tenantId, id)
  }

  async getHistory (tenantId: string, residentId: string, query: PaginationQueryDto) {
    await this.scope.assertResident(tenantId, residentId)
    const { page, limit, skip } = getPaginationParams(query)
    const where = { tenantId, residentId }
    const [data, total] = await Promise.all([
      this.prisma.residentHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.residentHistory.count({ where }),
    ])
    return buildPaginatedResult(data, total, page, limit)
  }

  async addHistoryEntry (tenantId: string, residentId: string, dto: CreateResidentHistoryDto) {
    await this.scope.assertResident(tenantId, residentId)
    return this.addHistory(tenantId, residentId, dto.event, dto.notes)
  }

  async addDocument (tenantId: string, residentId: string, dto: CreateResidentDocumentDto) {
    await this.scope.assertResident(tenantId, residentId)
    const doc = await this.prisma.document.create({
      data: { ...dto, tenantId, residentId },
    })
    await this.addHistory(tenantId, residentId, 'DOCUMENT_ADDED', dto.title)
    return doc
  }

  async listDocuments (tenantId: string, residentId: string) {
    await this.scope.assertResident(tenantId, residentId)
    return this.prisma.document.findMany({
      where: { tenantId, residentId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async removeDocument (tenantId: string, residentId: string, documentId: string) {
    await this.scope.assertResident(tenantId, residentId)
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, residentId, tenantId, deletedAt: null },
    })
    if (!doc) throw new NotFoundException('Document not found')
    return this.prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    })
  }

  async addPet (tenantId: string, residentId: string, dto: CreatePetDto) {
    await this.scope.assertResident(tenantId, residentId)
    const pet = await this.prisma.pet.create({
      data: { ...dto, tenantId, residentId },
    })
    await this.addHistory(tenantId, residentId, 'PET_ADDED', dto.name)
    return pet
  }

  private addHistory (tenantId: string, residentId: string, event: string, notes?: string) {
    return this.prisma.residentHistory.create({
      data: { tenantId, residentId, event, notes },
    })
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
}

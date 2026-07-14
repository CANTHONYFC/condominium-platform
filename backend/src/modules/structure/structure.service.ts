import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantScopeService } from '../../common/services/tenant-scope.service'
import { BaseRepository } from '../../common/repositories/base.repository'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import { nextCorrelativeCode, nextDepartmentCode, formatDepartmentCode, nextDepartmentCounter, normalizeUnitCodePrefix, DEFAULT_UNIT_CODE_PREFIX } from '../../common/utils/correlative-code'
import { OrganizationType, PropertyType, Prisma } from '../../../generated/prisma'
import {
  CreateBlockDto,
  CreateFloorDto,
  CreateTowerDto,
  CreateUnitDto,
  GenerateStructureDto,
  GenerateDepartmentUnitsDto,
  UpdateBlockDto,
  UpdateFloorDto,
  UpdateTowerDto,
  UpdateUnitDto,
} from './dto/structure.dto'

@Injectable()
export class StructureRepository extends BaseRepository {
  constructor (prisma: PrismaService) {
    super(prisma)
  }
}

@Injectable()
export class StructureService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly scope: TenantScopeService,
    private readonly repository: StructureRepository,
  ) {}

  // ─── Towers ────────────────────────────────────────────────────────────────

  async findTowers (tenantId: string, condominiumId: string, query: PaginationQueryDto) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    return this.repository.findPaginated('tower', tenantId, query, { condominiumId })
  }

  async createTower (tenantId: string, condominiumId: string, dto: CreateTowerDto) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const code = await nextCorrelativeCode(this.prisma, {
      entity: 'tower',
      condominiumId,
      prefix: 'TOR',
    })
    return this.prisma.tower.create({
      data: { ...dto, code, tenantId, condominiumId },
    })
  }

  async updateTower (tenantId: string, condominiumId: string, id: string, dto: UpdateTowerDto) {
    await this.assertTower(tenantId, condominiumId, id)
    return this.prisma.tower.update({ where: { id }, data: dto })
  }

  async removeTower (tenantId: string, condominiumId: string, id: string) {
    await this.assertTower(tenantId, condominiumId, id)
    return this.repository.softDelete('tower', tenantId, id)
  }

  // ─── Blocks ────────────────────────────────────────────────────────────────

  async findBlocks (tenantId: string, condominiumId: string, query: PaginationQueryDto) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    return this.repository.findPaginated('block', tenantId, query, { condominiumId })
  }

  async createBlock (tenantId: string, condominiumId: string, dto: CreateBlockDto) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const code = await nextCorrelativeCode(this.prisma, {
      entity: 'block',
      condominiumId,
      prefix: 'BLQ',
    })
    return this.prisma.block.create({
      data: { ...dto, code, tenantId, condominiumId },
    })
  }

  async updateBlock (tenantId: string, condominiumId: string, id: string, dto: UpdateBlockDto) {
    await this.assertBlock(tenantId, condominiumId, id)
    return this.prisma.block.update({ where: { id }, data: dto })
  }

  async removeBlock (tenantId: string, condominiumId: string, id: string) {
    await this.assertBlock(tenantId, condominiumId, id)
    return this.repository.softDelete('block', tenantId, id)
  }

  // ─── Floors ────────────────────────────────────────────────────────────────

  async findFloors (tenantId: string, condominiumId: string, query: PaginationQueryDto) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const { page, limit, skip } = getPaginationParams(query)
    const where = {
      tenantId,
      condominiumId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.floor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { number: 'asc' },
        include: { tower: true, block: true, _count: { select: { units: { where: { deletedAt: null } } } } },
      }),
      this.prisma.floor.count({ where }),
    ])
    return buildPaginatedResult(data, total, page, limit)
  }

  async createFloor (tenantId: string, condominiumId: string, dto: CreateFloorDto) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    return this.prisma.floor.create({
      data: { ...dto, tenantId, condominiumId },
    })
  }

  async updateFloor (tenantId: string, condominiumId: string, id: string, dto: UpdateFloorDto) {
    await this.assertFloor(tenantId, condominiumId, id)
    return this.prisma.floor.update({ where: { id }, data: dto })
  }

  async removeFloor (tenantId: string, condominiumId: string, id: string) {
    await this.assertFloor(tenantId, condominiumId, id)
    return this.repository.softDelete('floor', tenantId, id)
  }

  // ─── Units ─────────────────────────────────────────────────────────────────

  async findUnits (tenantId: string, condominiumId: string, query: PaginationQueryDto) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const { page, limit, skip } = getPaginationParams(query)
    const where = {
      tenantId,
      condominiumId,
      deletedAt: null,
      ...(query.search
        ? { code: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        include: {
          floor: { include: { tower: true, block: true } },
          ownerships: {
            where: { deletedAt: null },
            include: { owner: true },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            take: 1,
          },
          _count: { select: { residents: true, ownerships: true } },
        },
      }),
      this.prisma.unit.count({ where }),
    ])
    return buildPaginatedResult(data, total, page, limit)
  }

  async findAvailableUnits (tenantId: string, condominiumId: string) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    return this.prisma.unit.findMany({
      where: {
        tenantId,
        condominiumId,
        deletedAt: null,
        occupancyStatus: { not: 'UNDER_MAINTENANCE' },
        ownerships: { none: { deletedAt: null } },
      },
      orderBy: [{ floor: { number: 'asc' } }, { code: 'asc' }],
      include: {
        floor: { include: { tower: true, block: true } },
      },
    })
  }

  async findUnit (tenantId: string, condominiumId: string, id: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, tenantId, condominiumId, deletedAt: null },
      include: {
        floor: { include: { tower: true, block: true } },
        ownerships: { where: { deletedAt: null }, include: { owner: true } },
        residents: { where: { deletedAt: null } },
      },
    })
    if (!unit) throw new NotFoundException('Unit not found')
    return unit
  }

  async createUnit (tenantId: string, condominiumId: string, dto: CreateUnitDto) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const condo = await this.loadCondominiumContext(tenantId, condominiumId)
    const mode = this.resolveStructureMode(condo.tenant.organizationType, condo.propertyType)
    const prefix = mode === 'BUILDING'
      ? this.readUnitCodePrefixFromSettings(condo.settings)
      : DEFAULT_UNIT_CODE_PREFIX
    const code = await nextDepartmentCode(this.prisma, condominiumId, prefix)
    const unit = await this.prisma.unit.create({
      data: {
        ...dto,
        code,
        tenantId,
        condominiumId,
        maintenanceFee: dto.maintenanceFee ?? 0,
      },
    })
    await this.prisma.condominium.update({
      where: { id: condominiumId },
      data: { totalUnits: { increment: 1 } },
    })
    return unit
  }

  async updateUnit (
    tenantId: string,
    condominiumId: string,
    id: string,
    dto: UpdateUnitDto,
  ) {
    await this.findUnit(tenantId, condominiumId, id)
    return this.prisma.unit.update({ where: { id }, data: dto })
  }

  async removeUnit (tenantId: string, condominiumId: string, id: string) {
    await this.findUnit(tenantId, condominiumId, id)
    await this.repository.softDelete('unit', tenantId, id)
    await this.prisma.condominium.update({
      where: { id: condominiumId },
      data: { totalUnits: { decrement: 1 } },
    })
    return { deleted: true }
  }

  async getStructureTree (tenantId: string, condominiumId: string) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const [towers, blocks, floors, units] = await Promise.all([
      this.prisma.tower.findMany({
        where: { tenantId, condominiumId, deletedAt: null },
        include: { floors: { where: { deletedAt: null }, orderBy: { number: 'asc' } } },
      }),
      this.prisma.block.findMany({
        where: { tenantId, condominiumId, deletedAt: null },
        include: { floors: { where: { deletedAt: null }, orderBy: { number: 'asc' } } },
      }),
      this.prisma.floor.count({ where: { tenantId, condominiumId, deletedAt: null } }),
      this.prisma.unit.groupBy({
        by: ['type'],
        where: { tenantId, condominiumId, deletedAt: null },
        _count: true,
      }),
    ])
    return { towers, blocks, totalFloors: floors, unitsByType: units }
  }

  async getStructureMode (tenantId: string, condominiumId: string) {
    const condo = await this.loadCondominiumContext(tenantId, condominiumId)
    const mode = this.resolveStructureMode(condo.tenant.organizationType, condo.propertyType)
    return {
      mode,
      organizationType: condo.tenant.organizationType,
      propertyType: condo.propertyType,
      unitCodePrefix: mode === 'BUILDING'
        ? this.readUnitCodePrefixFromSettings(condo.settings)
        : DEFAULT_UNIT_CODE_PREFIX,
    }
  }

  async generateStructure (
    tenantId: string,
    condominiumId: string,
    dto: GenerateStructureDto,
  ) {
    const condo = await this.loadCondominiumContext(tenantId, condominiumId)
    const mode = this.resolveStructureMode(condo.tenant.organizationType, condo.propertyType)

    const existing = await this.countExistingStructure(tenantId, condominiumId)
    const hasExisting = existing.towers > 0 || existing.floors > 0 || existing.units > 0

    if (hasExisting && !dto.replaceExisting) {
      throw new BadRequestException(
        'Ya existe estructura registrada. Confirma reemplazo para generar de nuevo.',
      )
    }

    if (mode === 'BUILDING') {
      this.validateBuildingDto(dto)
      return this.generateBuildingStructure(tenantId, condominiumId, dto, hasExisting)
    }

    this.validateCondominiumDto(dto)
    return this.generateCondominiumStructure(tenantId, condominiumId, dto, hasExisting)
  }

  async generateDepartmentUnits (
    tenantId: string,
    condominiumId: string,
    dto: GenerateDepartmentUnitsDto,
  ) {
    const condo = await this.loadCondominiumContext(tenantId, condominiumId)
    const mode = this.resolveStructureMode(condo.tenant.organizationType, condo.propertyType)
    const prefix = mode === 'BUILDING'
      ? normalizeUnitCodePrefix(dto.unitCodePrefix ?? this.readUnitCodePrefixFromSettings(condo.settings))
      : DEFAULT_UNIT_CODE_PREFIX

    const floors = await this.prisma.floor.findMany({
      where: { tenantId, condominiumId, deletedAt: null },
      include: { tower: true },
      orderBy: [{ tower: { code: 'asc' } }, { number: 'asc' }],
    })

    if (floors.length === 0) {
      throw new BadRequestException('Primero registra los pisos o usa Generar estructura completa')
    }

    const existingUnits = await this.prisma.unit.count({
      where: { tenantId, condominiumId, deletedAt: null },
    })

    if (existingUnits > 0 && !dto.replaceExisting) {
      throw new BadRequestException(
        'Ya hay departamentos registrados. Confirma reemplazo o agrégalos uno a uno por piso.',
      )
    }

    let unitsCreated = 0
    let firstCode = ''
    let lastCode = ''

    await this.prisma.$transaction(async (tx) => {
      if (dto.replaceExisting && existingUnits > 0) {
        await tx.unit.updateMany({
          where: { tenantId, condominiumId, deletedAt: null },
          data: { deletedAt: new Date() },
        })
      }

      let counter = await nextDepartmentCounter(tx, condominiumId, prefix)

      for (const floor of floors) {
        for (let index = 0; index < dto.unitsPerFloor; index++) {
          const code = formatDepartmentCode(counter, prefix)
          if (unitsCreated === 0) firstCode = code

          await tx.unit.create({
            data: {
              tenantId,
              condominiumId,
              floorId: floor.id,
              code,
              type: 'APARTMENT',
              occupancyStatus: 'VACANT',
              maintenanceFee: 0,
            },
          })

          lastCode = code
          counter += 1
          unitsCreated += 1
        }
      }

      const totalUnits = await tx.unit.count({
        where: { tenantId, condominiumId, deletedAt: null },
      })

      await tx.condominium.update({
        where: { id: condominiumId },
        data: {
          totalUnits,
          ...(mode === 'BUILDING'
            ? { settings: this.mergeCondoSettings(condo.settings, { unitCodePrefix: prefix }) }
            : {}),
        },
      })
    })

    return {
      floorsProcessed: floors.length,
      unitsCreated,
      firstCode,
      lastCode,
    }
  }

  private async generateBuildingStructure (
    tenantId: string,
    condominiumId: string,
    dto: GenerateStructureDto,
    hasExisting: boolean,
  ) {
    const floorsCount = dto.floorsCount!
    const unitsPerFloor = dto.unitsPerFloor!
    const prefix = normalizeUnitCodePrefix(dto.unitCodePrefix)
    let totalUnits = 0
    let unitCounter = 1

    const condo = await this.prisma.condominium.findFirstOrThrow({
      where: { id: condominiumId, tenantId },
      select: { settings: true },
    })

    return this.prisma.$transaction(async (tx) => {
      if (hasExisting) {
        await this.clearStructureInTx(tx, tenantId, condominiumId)
      }

      for (let floorNumber = 1; floorNumber <= floorsCount; floorNumber++) {
        const floor = await tx.floor.create({
          data: {
            tenantId,
            condominiumId,
            number: floorNumber,
            name: `Piso ${floorNumber}`,
          },
        })

        for (let unitIndex = 1; unitIndex <= unitsPerFloor; unitIndex++) {
          await tx.unit.create({
            data: {
              tenantId,
              condominiumId,
              floorId: floor.id,
              code: formatDepartmentCode(unitCounter, prefix),
              type: 'APARTMENT',
              occupancyStatus: 'VACANT',
              maintenanceFee: 0,
            },
          })
          unitCounter += 1
          totalUnits += 1
        }
      }

      await tx.condominium.update({
        where: { id: condominiumId },
        data: {
          totalUnits,
          settings: this.mergeCondoSettings(condo.settings, { unitCodePrefix: prefix }),
        },
      })

      return {
        mode: 'BUILDING' as const,
        towersCreated: 0,
        floorsCreated: floorsCount,
        unitsCreated: totalUnits,
      }
    })
  }

  private async generateCondominiumStructure (
    tenantId: string,
    condominiumId: string,
    dto: GenerateStructureDto,
    hasExisting: boolean,
  ) {
    const towersCount = dto.towersCount!
    const floorsPerTower = dto.floorsPerTower!
    const unitsPerFloor = dto.unitsPerFloor!
    let totalUnits = 0
    let floorsCreated = 0
    let unitCounter = 1

    return this.prisma.$transaction(async (tx) => {
      if (hasExisting) {
        await this.clearStructureInTx(tx, tenantId, condominiumId)
      }

      for (let towerIndex = 1; towerIndex <= towersCount; towerIndex++) {
        const towerCode = `TOR-${String(towerIndex).padStart(3, '0')}`

        const tower = await tx.tower.create({
          data: {
            tenantId,
            condominiumId,
            code: towerCode,
            name: `Torre ${towerIndex}`,
            floorsCount: floorsPerTower,
          },
        })

        for (let floorNumber = 1; floorNumber <= floorsPerTower; floorNumber++) {
          const floor = await tx.floor.create({
            data: {
              tenantId,
              condominiumId,
              towerId: tower.id,
              number: floorNumber,
              name: `Piso ${floorNumber}`,
            },
          })
          floorsCreated += 1

          for (let unitIndex = 1; unitIndex <= unitsPerFloor; unitIndex++) {
            await tx.unit.create({
              data: {
                tenantId,
                condominiumId,
                floorId: floor.id,
                code: formatDepartmentCode(unitCounter),
                type: 'APARTMENT',
                occupancyStatus: 'VACANT',
                maintenanceFee: 0,
              },
            })
            unitCounter += 1
            totalUnits += 1
          }
        }
      }

      await tx.condominium.update({
        where: { id: condominiumId },
        data: { totalUnits },
      })

      return {
        mode: 'CONDOMINIUM' as const,
        towersCreated: towersCount,
        floorsCreated,
        unitsCreated: totalUnits,
      }
    })
  }

  private validateBuildingDto (dto: GenerateStructureDto) {
    if (!dto.floorsCount || !dto.unitsPerFloor) {
      throw new BadRequestException('Indica cantidad de pisos y departamentos por piso')
    }
  }

  private validateCondominiumDto (dto: GenerateStructureDto) {
    if (!dto.towersCount || !dto.floorsPerTower || !dto.unitsPerFloor) {
      throw new BadRequestException('Indica torres, pisos por torre y domicilios por piso')
    }
  }

  private readUnitCodePrefixFromSettings (settings: unknown): string {
    if (settings && typeof settings === 'object' && 'unitCodePrefix' in settings) {
      const value = (settings as { unitCodePrefix?: unknown }).unitCodePrefix
      if (typeof value === 'string') return normalizeUnitCodePrefix(value)
    }
    return DEFAULT_UNIT_CODE_PREFIX
  }

  private mergeCondoSettings (settings: unknown, patch: Record<string, unknown>): Prisma.InputJsonValue {
    const base = settings && typeof settings === 'object' && !Array.isArray(settings)
      ? { ...(settings as Record<string, unknown>) }
      : {}
    return { ...base, ...patch } as Prisma.InputJsonValue
  }

  private resolveStructureMode (
    organizationType: OrganizationType,
    propertyType: PropertyType,
  ): 'BUILDING' | 'CONDOMINIUM' {
    if (organizationType === 'BUILDING') return 'BUILDING'
    if (organizationType === 'CONDOMINIUM') return 'CONDOMINIUM'
    return propertyType === 'BUILDING' ? 'BUILDING' : 'CONDOMINIUM'
  }

  private async loadCondominiumContext (tenantId: string, condominiumId: string) {
    const condo = await this.prisma.condominium.findFirst({
      where: { id: condominiumId, tenantId, deletedAt: null },
      include: { tenant: true },
    })
    if (!condo) throw new NotFoundException('Condominium not found')
    return condo
  }

  private async countExistingStructure (tenantId: string, condominiumId: string) {
    const [towers, floors, units] = await Promise.all([
      this.prisma.tower.count({ where: { tenantId, condominiumId, deletedAt: null } }),
      this.prisma.floor.count({ where: { tenantId, condominiumId, deletedAt: null } }),
      this.prisma.unit.count({ where: { tenantId, condominiumId, deletedAt: null } }),
    ])
    return { towers, floors, units }
  }

  private async clearStructureInTx (
    tx: Prisma.TransactionClient,
    tenantId: string,
    condominiumId: string,
  ) {
    const now = new Date()
    await tx.unit.updateMany({
      where: { tenantId, condominiumId, deletedAt: null },
      data: { deletedAt: now },
    })
    await tx.floor.updateMany({
      where: { tenantId, condominiumId, deletedAt: null },
      data: { deletedAt: now },
    })
    await tx.tower.updateMany({
      where: { tenantId, condominiumId, deletedAt: null },
      data: { deletedAt: now },
    })
    await tx.condominium.update({
      where: { id: condominiumId },
      data: { totalUnits: 0 },
    })
  }

  private async assertTower (tenantId: string, condominiumId: string, id: string) {
    const item = await this.prisma.tower.findFirst({
      where: { id, tenantId, condominiumId, deletedAt: null },
    })
    if (!item) throw new NotFoundException('Tower not found')
    return item
  }

  private async assertBlock (tenantId: string, condominiumId: string, id: string) {
    const item = await this.prisma.block.findFirst({
      where: { id, tenantId, condominiumId, deletedAt: null },
    })
    if (!item) throw new NotFoundException('Block not found')
    return item
  }

  private async assertFloor (tenantId: string, condominiumId: string, id: string) {
    const item = await this.prisma.floor.findFirst({
      where: { id, tenantId, condominiumId, deletedAt: null },
    })
    if (!item) throw new NotFoundException('Floor not found')
    return item
  }
}

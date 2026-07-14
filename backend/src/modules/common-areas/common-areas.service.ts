import { Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantScopeService } from '../../common/services/tenant-scope.service'
import { nextCorrelativeCode } from '../../common/utils/correlative-code'
import {
  CreateBlockDto,
  CreateCommonAreaDto,
  UpdateBlockDto,
  UpdateCommonAreaDto,
  UpsertScheduleDto,
} from './dto/common-area.dto'

@Injectable()
export class CommonAreasService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly scope: TenantScopeService,
  ) {}

  async listByCondominium (tenantId: string, condominiumId: string) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    return this.prisma.commonArea.findMany({
      where: { tenantId, condominiumId, deletedAt: null },
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        blocks: {
          where: { deletedAt: null, endAt: { gte: new Date() } },
          orderBy: { startAt: 'asc' },
        },
        _count: { select: { reservations: true } },
      },
      orderBy: { code: 'asc' },
    })
  }

  async create (tenantId: string, condominiumId: string, dto: CreateCommonAreaDto) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const code = await nextCorrelativeCode(this.prisma, {
      entity: 'commonArea',
      condominiumId,
      prefix: 'ZON',
    })
    return this.prisma.commonArea.create({
      data: {
        tenantId,
        condominiumId,
        code,
        name: dto.name,
        description: dto.description,
        capacity: dto.capacity,
        maxReservationHours: dto.maxReservationHours ?? 2,
      },
    })
  }

  async findOne (tenantId: string, id: string) {
    const area = await this.prisma.commonArea.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        blocks: { where: { deletedAt: null }, orderBy: { startAt: 'desc' } },
      },
    })
    if (!area) throw new NotFoundException('Common area not found')
    return area
  }

  async update (tenantId: string, id: string, dto: UpdateCommonAreaDto) {
    await this.findOne(tenantId, id)
    return this.prisma.commonArea.update({
      where: { id },
      data: dto,
    })
  }

  async remove (tenantId: string, id: string) {
    await this.findOne(tenantId, id)
    return this.prisma.commonArea.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async upsertSchedule (tenantId: string, commonAreaId: string, dto: UpsertScheduleDto) {
    await this.findOne(tenantId, commonAreaId)
    return this.prisma.commonAreaSchedule.upsert({
      where: {
        commonAreaId_dayOfWeek: { commonAreaId, dayOfWeek: dto.dayOfWeek },
      },
      create: {
        tenantId,
        commonAreaId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotMinutes: dto.slotMinutes ?? 60,
      },
      update: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotMinutes: dto.slotMinutes ?? 60,
      },
    })
  }

  async removeSchedule (tenantId: string, commonAreaId: string, dayOfWeek: number) {
    await this.findOne(tenantId, commonAreaId)
    await this.prisma.commonAreaSchedule.deleteMany({
      where: { commonAreaId, dayOfWeek },
    })
    return { ok: true }
  }

  async listBlocks (tenantId: string, commonAreaId: string) {
    await this.findOne(tenantId, commonAreaId)
    return this.prisma.commonAreaBlock.findMany({
      where: { tenantId, commonAreaId, deletedAt: null },
      orderBy: { startAt: 'desc' },
    })
  }

  async createBlock (tenantId: string, commonAreaId: string, dto: CreateBlockDto) {
    await this.findOne(tenantId, commonAreaId)
    return this.prisma.commonAreaBlock.create({
      data: {
        tenantId,
        commonAreaId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        reason: dto.reason,
      },
    })
  }

  async updateBlock (
    tenantId: string,
    commonAreaId: string,
    blockId: string,
    dto: UpdateBlockDto,
  ) {
    await this.findOne(tenantId, commonAreaId)
    const block = await this.prisma.commonAreaBlock.findFirst({
      where: { id: blockId, commonAreaId, tenantId, deletedAt: null },
    })
    if (!block) throw new NotFoundException('Block not found')
    return this.prisma.commonAreaBlock.update({
      where: { id: blockId },
      data: {
        ...(dto.startAt ? { startAt: new Date(dto.startAt) } : {}),
        ...(dto.endAt ? { endAt: new Date(dto.endAt) } : {}),
        ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
      },
    })
  }

  async removeBlock (tenantId: string, commonAreaId: string, blockId: string) {
    await this.findOne(tenantId, commonAreaId)
    return this.prisma.commonAreaBlock.update({
      where: { id: blockId },
      data: { deletedAt: new Date() },
    })
  }
}

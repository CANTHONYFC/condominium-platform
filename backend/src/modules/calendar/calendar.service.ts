import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'

import { EXPENSE_CATEGORY_SERVICE } from '../../common/constants/expense-categories'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantScopeService } from '../../common/services/tenant-scope.service'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto'
import type { CalendarEvent } from '../../../generated/prisma'

@Injectable()
export class CalendarService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly scope: TenantScopeService,
  ) {}

  async findAll (
    tenantId: string,
    query: PaginationQueryDto,
    condominiumId?: string,
    type?: string,
    from?: string,
    to?: string,
  ) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = {
      tenantId,
      deletedAt: null,
      ...(condominiumId ? { condominiumId } : {}),
      ...(type ? { type } : {}),
      ...(from || to
        ? {
            AND: [
              from ? { endAt: { gte: new Date(from) } } : {},
              to ? { startAt: { lte: new Date(to) } } : {},
            ],
          }
        : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'asc' },
        include: {
          commonArea: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.calendarEvent.count({ where }),
    ])
    return buildPaginatedResult(data, total, page, limit)
  }

  async create (tenantId: string, dto: CreateCalendarEventDto) {
    await this.scope.assertCondominium(tenantId, dto.condominiumId)
    if (dto.commonAreaId) {
      await this.assertCommonArea(tenantId, dto.condominiumId, dto.commonAreaId)
    }
    const event = await this.prisma.calendarEvent.create({
      data: {
        tenantId,
        condominiumId: dto.condominiumId,
        commonAreaId: dto.commonAreaId ?? null,
        title: dto.title,
        description: dto.description,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        allDay: dto.allDay ?? false,
        type: dto.type ?? 'MAINTENANCE',
        vendor: dto.vendor,
        cost: dto.cost,
        attachmentUrl: dto.attachmentUrl,
        status: dto.status ?? 'SCHEDULED',
      },
      include: {
        commonArea: { select: { id: true, code: true, name: true } },
      },
    })
    await this.syncMaintenanceExpense(tenantId, event)
    return event
  }

  async findOne (tenantId: string, id: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
    if (!event) throw new NotFoundException('Event not found')
    return event
  }

  async update (tenantId: string, id: string, dto: UpdateCalendarEventDto) {
    const existing = await this.findOne(tenantId, id)
    if (dto.commonAreaId) {
      const condoId = existing.condominiumId
      if (!condoId) throw new BadRequestException('Evento sin condominio')
      await this.assertCommonArea(tenantId, condoId, dto.commonAreaId)
    }
    const event = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.startAt ? { startAt: new Date(dto.startAt) } : {}),
        ...(dto.endAt ? { endAt: new Date(dto.endAt) } : {}),
        ...(dto.allDay !== undefined ? { allDay: dto.allDay } : {}),
        ...(dto.vendor !== undefined ? { vendor: dto.vendor } : {}),
        ...(dto.cost !== undefined ? { cost: dto.cost } : {}),
        ...(dto.attachmentUrl !== undefined ? { attachmentUrl: dto.attachmentUrl } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.commonAreaId !== undefined ? { commonAreaId: dto.commonAreaId || null } : {}),
      },
      include: {
        commonArea: { select: { id: true, code: true, name: true } },
      },
    })
    await this.syncMaintenanceExpense(tenantId, event)
    return event
  }

  async remove (tenantId: string, id: string) {
    await this.findOne(tenantId, id)
    await this.prisma.transaction.updateMany({
      where: { tenantId, calendarEventId: id, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    return this.prisma.calendarEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async maintenanceSummary (tenantId: string, condominiumId: string, from?: string, to?: string) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const where = {
      tenantId,
      condominiumId,
      type: 'MAINTENANCE',
      deletedAt: null,
      ...(from || to
        ? {
            AND: [
              from ? { endAt: { gte: new Date(from) } } : {},
              to ? { startAt: { lte: new Date(to) } } : {},
            ],
          }
        : {}),
    }
    const events = await this.prisma.calendarEvent.findMany({ where })
    const totalCost = events.reduce((s, e) => s + Number(e.cost ?? 0), 0)
    return {
      total: events.length,
      totalCost,
      completed: events.filter((e) => e.status === 'COMPLETED').length,
    }
  }

  private async assertCommonArea (
    tenantId: string,
    condominiumId: string,
    commonAreaId: string,
  ) {
    const area = await this.prisma.commonArea.findFirst({
      where: { id: commonAreaId, tenantId, condominiumId, deletedAt: null },
    })
    if (!area) throw new BadRequestException('Área común no válida para este condominio')
  }

  private async syncMaintenanceExpense (tenantId: string, event: CalendarEvent) {
    if (event.type !== 'MAINTENANCE' || !event.condominiumId) return

    const existing = await this.prisma.transaction.findFirst({
      where: { tenantId, calendarEventId: event.id },
    })

    const cost = Number(event.cost ?? 0)
    const shouldRemove = cost <= 0 || event.status === 'CANCELLED' || event.deletedAt

    if (shouldRemove) {
      if (existing && !existing.deletedAt) {
        await this.prisma.transaction.update({
          where: { id: existing.id },
          data: { deletedAt: new Date() },
        })
      }
      return
    }

    const areaLabel = event.commonAreaId
      ? (await this.prisma.commonArea.findFirst({
          where: { id: event.commonAreaId },
          select: { name: true },
        }))?.name
      : null

    const description = [
      `Mantenimiento: ${event.title}`,
      areaLabel ? `Área: ${areaLabel}` : null,
      event.description || null,
    ].filter(Boolean).join(' · ')

    const data = {
      tenantId,
      condominiumId: event.condominiumId,
      type: 'EXPENSE' as const,
      category: EXPENSE_CATEGORY_SERVICE,
      amount: cost,
      description,
      vendor: event.vendor,
      attachmentUrl: event.attachmentUrl,
      transactionDate: event.startAt,
      calendarEventId: event.id,
      deletedAt: null as Date | null,
    }

    if (existing) {
      await this.prisma.transaction.update({
        where: { id: existing.id },
        data,
      })
      return
    }

    await this.prisma.transaction.create({ data })
  }
}

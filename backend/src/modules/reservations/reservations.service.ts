import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantScopeService } from '../../common/services/tenant-scope.service'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import { CreateReservationDto, UpdateReservationDto } from './dto/reservation.dto'
import { ReservationStatus } from '../../../generated/prisma'

function parseTime (time: string) {
  const [h, m] = time.split(':').map(Number)
  return { h, m }
}

function atTime (date: Date, time: string) {
  const { h, m } = parseTime(time)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d
}

function overlaps (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

function parseLocalDate (dateStr: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

@Injectable()
export class ReservationsService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly scope: TenantScopeService,
  ) {}

  async findAll (
    tenantId: string,
    query: PaginationQueryDto,
    condominiumId?: string,
    commonAreaId?: string,
    from?: string,
    to?: string,
  ) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = {
      tenantId,
      deletedAt: null,
      ...(condominiumId ? { condominiumId } : {}),
      ...(commonAreaId ? { commonAreaId } : {}),
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
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'asc' },
        include: {
          commonArea: { select: { id: true, code: true, name: true, condominiumId: true } },
          unit: {
            select: {
              id: true,
              code: true,
              ownerships: {
                where: { deletedAt: null, isPrimary: true },
                take: 1,
                include: {
                  owner: {
                    select: {
                      type: true,
                      firstName: true,
                      lastName: true,
                      legalName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              type: true,
            },
          },
        },
      }),
      this.prisma.reservation.count({ where }),
    ])
    return buildPaginatedResult(
      data.map((row) => ({
        ...row,
        bookedBy: this.resolveBookedBy(row),
      })),
      total,
      page,
      limit,
    )
  }

  private resolveBookedBy (row: {
    unit: {
      code: string
      ownerships: {
        owner: {
          type: string
          firstName: string | null
          lastName: string | null
          legalName: string | null
          email: string | null
          phone: string | null
        }
      }[]
    } | null
    resident: {
      firstName: string
      lastName: string
      email: string | null
      phone: string | null
      type: string
    } | null
  }) {
    if (row.resident) {
      return {
        name: `${row.resident.firstName} ${row.resident.lastName}`.trim(),
        email: row.resident.email,
        phone: row.resident.phone,
        unitCode: row.unit?.code ?? null,
        role: row.resident.type === 'OWNER' ? 'Propietario' : 'Residente',
      }
    }
    const owner = row.unit?.ownerships[0]?.owner
    if (owner) {
      const name = owner.type === 'LEGAL'
        ? (owner.legalName ?? 'Propietario')
        : `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || 'Propietario'
      return {
        name,
        email: owner.email,
        phone: owner.phone,
        unitCode: row.unit?.code ?? null,
        role: 'Propietario',
      }
    }
    return {
      name: null,
      email: null,
      phone: null,
      unitCode: row.unit?.code ?? null,
      role: null,
    }
  }

  async getAvailability (tenantId: string, commonAreaId: string, dateStr: string) {
    const area = await this.prisma.commonArea.findFirst({
      where: { id: commonAreaId, tenantId, deletedAt: null },
      include: { schedules: true },
    })
    if (!area) throw new NotFoundException('Common area not found')

    const date = parseLocalDate(dateStr)
    if (!date) throw new BadRequestException('Invalid date')
    const dayOfWeek = date.getDay()
    const schedule = area.schedules.find((s) => s.dayOfWeek === dayOfWeek)
    if (!schedule) {
      return { date: dateStr, slots: [], message: 'No hay horario configurado para este día' }
    }

    const dayStart = atTime(date, schedule.startTime)
    const dayEnd = atTime(date, schedule.endTime)
    const slots: {
      startAt: string
      endAt: string
      available: boolean
      unavailableReason?: 'RESERVED' | 'ADMIN_BLOCK' | 'MAINTENANCE'
    }[] = []

    let cursor = dayStart
    while (cursor < dayEnd) {
      const slotEnd = new Date(cursor.getTime() + schedule.slotMinutes * 60000)
      if (slotEnd > dayEnd) break
      slots.push({
        startAt: cursor.toISOString(),
        endAt: slotEnd.toISOString(),
        available: true,
      })
      cursor = slotEnd
    }

    const dayFrom = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
    const dayTo = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

    const [blocks, reservations, maintenanceEvents] = await Promise.all([
      this.prisma.commonAreaBlock.findMany({
        where: {
          commonAreaId,
          tenantId,
          deletedAt: null,
          startAt: { lte: dayTo },
          endAt: { gte: dayFrom },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          commonAreaId,
          tenantId,
          deletedAt: null,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startAt: { lte: dayTo },
          endAt: { gte: dayFrom },
        },
      }),
      this.prisma.calendarEvent.findMany({
        where: {
          commonAreaId,
          tenantId,
          deletedAt: null,
          type: 'MAINTENANCE',
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          startAt: { lte: dayTo },
          endAt: { gte: dayFrom },
        },
      }),
    ])

    for (const slot of slots) {
      const s = new Date(slot.startAt)
      const e = new Date(slot.endAt)
      const blocked = blocks.some((b) => overlaps(s, e, b.startAt, b.endAt))
      const booked = reservations.some((r) => overlaps(s, e, r.startAt, r.endAt))
      const underMaintenance = maintenanceEvents.some((m) => overlaps(s, e, m.startAt, m.endAt))
      if (booked) {
        slot.available = false
        slot.unavailableReason = 'RESERVED'
      } else if (blocked) {
        slot.available = false
        slot.unavailableReason = 'ADMIN_BLOCK'
      } else if (underMaintenance) {
        slot.available = false
        slot.unavailableReason = 'MAINTENANCE'
      } else {
        slot.available = true
      }
    }

    return {
      date: dateStr,
      dayOfWeek,
      maxReservationHours: area.maxReservationHours ?? 2,
      schedule: {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        slotMinutes: schedule.slotMinutes,
      },
      slots,
    }
  }

  async create (tenantId: string, dto: CreateReservationDto) {
    await this.scope.assertCondominium(tenantId, dto.condominiumId)
    const area = await this.prisma.commonArea.findFirst({
      where: { id: dto.commonAreaId, tenantId, condominiumId: dto.condominiumId, deletedAt: null },
      include: { schedules: true },
    })
    if (!area) throw new NotFoundException('Common area not found')

    const startAt = new Date(dto.startAt)
    const endAt = new Date(dto.endAt)
    if (endAt <= startAt) throw new BadRequestException('endAt must be after startAt')

    const maxHours = area.maxReservationHours ?? 2
    const durationHours = (endAt.getTime() - startAt.getTime()) / 3600000
    if (durationHours > maxHours) {
      throw new BadRequestException(`La reserva no puede exceder ${maxHours} hora(s)`)
    }

    await this.assertSlotAvailable(tenantId, dto.commonAreaId, startAt, endAt, area.schedules)

    return this.prisma.reservation.create({
      data: {
        tenantId,
        condominiumId: dto.condominiumId,
        commonAreaId: dto.commonAreaId,
        unitId: dto.unitId,
        residentId: dto.residentId,
        startAt,
        endAt,
        notes: dto.notes,
        status: 'CONFIRMED',
      },
      include: { commonArea: { select: { code: true, name: true } } },
    })
  }

  async update (tenantId: string, id: string, dto: UpdateReservationDto) {
    const existing = await this.prisma.reservation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { commonArea: { include: { schedules: true } } },
    })
    if (!existing) throw new NotFoundException('Reservation not found')

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt
    const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt

    if (dto.startAt || dto.endAt) {
      await this.assertSlotAvailable(
        tenantId,
        existing.commonAreaId,
        startAt,
        endAt,
        existing.commonArea.schedules,
        id,
      )
    }

    return this.prisma.reservation.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.startAt ? { startAt } : {}),
        ...(dto.endAt ? { endAt } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: { commonArea: { select: { code: true, name: true } } },
    })
  }

  async cancel (tenantId: string, id: string) {
    const existing = await this.prisma.reservation.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
    if (!existing) throw new NotFoundException('Reservation not found')
    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' as ReservationStatus },
    })
  }

  private async assertSlotAvailable (
    tenantId: string,
    commonAreaId: string,
    startAt: Date,
    endAt: Date,
    schedules: { dayOfWeek: number; startTime: string; endTime: string }[],
    excludeId?: string,
  ) {
    const schedule = schedules.find((s) => s.dayOfWeek === startAt.getDay())
    if (!schedule) throw new BadRequestException('El área no tiene horario para este día')

    const open = atTime(startAt, schedule.startTime)
    const close = atTime(startAt, schedule.endTime)
    if (startAt < open || endAt > close) {
      throw new BadRequestException('La reserva está fuera del horario permitido')
    }

    const [blocks, reservations, maintenanceEvents] = await Promise.all([
      this.prisma.commonAreaBlock.findMany({
        where: {
          commonAreaId,
          tenantId,
          deletedAt: null,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          commonAreaId,
          tenantId,
          deletedAt: null,
          status: { in: ['PENDING', 'CONFIRMED'] },
          ...(excludeId ? { id: { not: excludeId } } : {}),
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      }),
      this.prisma.calendarEvent.findMany({
        where: {
          commonAreaId,
          tenantId,
          deletedAt: null,
          type: 'MAINTENANCE',
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      }),
    ])

    if (blocks.length) throw new BadRequestException('Horario bloqueado por administración')
    if (maintenanceEvents.length) {
      throw new BadRequestException('Horario bloqueado por mantenimiento programado')
    }
    if (reservations.length) throw new BadRequestException('El horario ya está reservado')
  }
}

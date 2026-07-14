import { ForbiddenException, Injectable } from '@nestjs/common'

import { PortalContextService } from '../../common/services/portal-context.service'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { FinanceService } from '../finance/finance.service'
import { ReservationsService } from '../reservations/reservations.service'
import { CommonAreasService } from '../common-areas/common-areas.service'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import { AccountStatementQueryDto } from '../finance/dto/finance.dto'
import { CreateReservationDto } from '../reservations/dto/reservation.dto'

export type { PortalContext } from '../../common/services/portal-context.service'

@Injectable()
export class PortalService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
    private readonly reservations: ReservationsService,
    private readonly commonAreas: CommonAreasService,
    private readonly portalContext: PortalContextService,
  ) {}

  resolveContext (tenantId: string, userId: string) {
    return this.portalContext.resolve(tenantId, userId)
  }

  async getHome (tenantId: string, userId: string) {
    const ctx = await this.portalContext.resolve(tenantId, userId)
    const statement = await this.finance.getAccountStatement(tenantId, ctx.unitId, {})
    const now = new Date()

    const upcomingReservations = await this.prisma.reservation.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [{ residentId: ctx.residentId }, { unitId: ctx.unitId }],
        startAt: { gte: now },
        status: { not: 'CANCELLED' },
      },
      orderBy: { startAt: 'asc' },
      take: 5,
      include: { commonArea: { select: { id: true, code: true, name: true } } },
    })

    const pendingDebts = statement.pendingDebts ?? []
    const pendingBalance = statement.summary.balance

    return {
      ...ctx,
      pendingBalance,
      pendingDebtsCount: pendingDebts.length,
      pendingDebts,
      hasPendingDebt: pendingBalance > 0.01,
      upcomingReservations,
      summary: statement.summary,
    }
  }

  async getMyReservations (
    tenantId: string,
    userId: string,
    query: PaginationQueryDto,
    from?: string,
    to?: string,
  ) {
    const ctx = await this.portalContext.resolve(tenantId, userId)
    const { page, limit, skip } = getPaginationParams(query)

    const where = {
      tenantId,
      deletedAt: null,
      OR: [{ residentId: ctx.residentId }, { unitId: ctx.unitId }],
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
        orderBy: { startAt: 'desc' },
        include: { commonArea: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.reservation.count({ where }),
    ])

    return { ...buildPaginatedResult(data, total, page, limit), context: ctx }
  }

  async getMyStatement (tenantId: string, userId: string, query: AccountStatementQueryDto) {
    const ctx = await this.portalContext.resolve(tenantId, userId)
    const statement = await this.finance.getAccountStatement(tenantId, ctx.unitId, query)
    return { ...statement, context: ctx }
  }

  async listMyCommonAreas (tenantId: string, userId: string) {
    const ctx = await this.portalContext.resolve(tenantId, userId)
    const areas = await this.commonAreas.listByCondominium(tenantId, ctx.condominiumId)
    return { context: ctx, areas }
  }

  async createMyReservation (tenantId: string, userId: string, dto: CreateReservationDto) {
    const ctx = await this.portalContext.resolve(tenantId, userId)
    if (dto.condominiumId !== ctx.condominiumId) {
      throw new ForbiddenException('Solo puedes reservar en tu condominio')
    }
    return this.reservations.create(tenantId, {
      ...dto,
      unitId: ctx.unitId,
      residentId: ctx.residentId,
    })
  }
}

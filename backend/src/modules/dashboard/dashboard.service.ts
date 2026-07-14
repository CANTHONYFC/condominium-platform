import { Injectable } from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'

@Injectable()
export class DashboardService {
  constructor (private readonly prisma: PrismaService) {}

  async getExecutiveKpis (tenantId: string, condominiumId?: string) {
    const condoFilter = condominiumId ? { condominiumId } : {}
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [
      openTickets,
      openIncidents,
      pendingFees,
      activeReservations,
      totalUnits,
      occupiedUnits,
      todayVisits,
      activeStaff,
      overdueFees,
      paymentsThisMonth,
      expensesThisMonth,
      chartPayments,
      chartExpenses,
      feeStatusGroups,
    ] = await Promise.all([
      this.prisma.ticket.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
          ...condoFilter,
        },
      }),
      this.prisma.incident.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['REPORTED', 'ASSIGNED', 'IN_PROGRESS'] },
          ...condoFilter,
        },
      }),
      this.prisma.maintenanceFee.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
          ...condoFilter,
        },
      }),
      this.prisma.reservation.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['PENDING', 'CONFIRMED'] },
          ...condoFilter,
        },
      }),
      this.prisma.unit.count({
        where: { tenantId, deletedAt: null, ...condoFilter },
      }),
      this.prisma.unit.count({
        where: {
          tenantId,
          deletedAt: null,
          occupancyStatus: 'OCCUPIED',
          ...condoFilter,
        },
      }),
      this.prisma.visit.count({
        where: {
          tenantId,
          scheduledAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
          ...condoFilter,
        },
      }),
      this.prisma.staffMember.count({
        where: { tenantId, deletedAt: null, isActive: true, ...condoFilter },
      }),
      this.prisma.maintenanceFee.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
          ...condoFilter,
        },
        select: {
          amount: true,
          paidAmount: true,
          status: true,
          unitId: true,
          unit: {
            select: {
              code: true,
              ownerships: {
                where: { deletedAt: null, isPrimary: true },
                include: { owner: true },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          paymentDate: { gte: monthStart, lte: monthEnd },
          ...(condominiumId
            ? { maintenanceFee: { condominiumId, deletedAt: null } }
            : {}),
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          type: 'EXPENSE',
          transactionDate: { gte: monthStart, lte: monthEnd },
          ...condoFilter,
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: {
          tenantId,
          deletedAt: null,
          paymentDate: { gte: chartStart },
          ...(condominiumId
            ? { maintenanceFee: { condominiumId, deletedAt: null } }
            : {}),
        },
        select: { amount: true, paymentDate: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          tenantId,
          deletedAt: null,
          type: 'EXPENSE',
          transactionDate: { gte: chartStart },
          ...condoFilter,
        },
        select: { amount: true, transactionDate: true },
      }),
      this.prisma.maintenanceFee.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null, ...condoFilter },
        _count: { _all: true },
      }),
    ])

    const morosityDebt = this.roundMoney(
      overdueFees.reduce(
        (sum, fee) => sum + this.moneyFromDecimal(fee.amount) - this.moneyFromDecimal(fee.paidAmount),
        0,
      ),
    )

    const incomeMonth = this.moneyFromDecimal(paymentsThisMonth._sum.amount)
    const expensesMonth = this.moneyFromDecimal(expensesThisMonth._sum.amount)

    const incomeAgg = await this.prisma.transaction.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        type: 'INCOME',
        ...condoFilter,
      },
      _sum: { amount: true },
    })

    const paymentsTotalAgg = await this.prisma.payment.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        ...(condominiumId
          ? { maintenanceFee: { condominiumId, deletedAt: null } }
          : {}),
      },
      _sum: { amount: true },
    })

    const expenseAgg = await this.prisma.transaction.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        type: 'EXPENSE',
        ...condoFilter,
      },
      _sum: { amount: true },
    })

    const incomeTotal = this.roundMoney(
      this.moneyFromDecimal(paymentsTotalAgg._sum.amount) + this.moneyFromDecimal(incomeAgg._sum.amount),
    )
    const expensesTotal = this.moneyFromDecimal(expenseAgg._sum.amount)

    const monthlyFinance = this.buildMonthlyFinance(chartPayments, chartExpenses, now)
    const morosityByUnit = this.buildMorosityByUnit(overdueFees)
    const feeStatus = this.buildFeeStatus(feeStatusGroups)

    const billedThisMonth = await this.prisma.maintenanceFee.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        ...condoFilter,
      },
      _sum: { amount: true, paidAmount: true },
    })

    const billedAmount = this.moneyFromDecimal(billedThisMonth._sum.amount)
    const collectedAmount = this.moneyFromDecimal(billedThisMonth._sum.paidAmount)
    const collectionRate = billedAmount > 0
      ? this.roundMoney((collectedAmount / billedAmount) * 100)
      : 0

    return {
      morosity: pendingFees,
      morosityDebt,
      income: incomeTotal,
      incomeMonth,
      expenses: expensesTotal,
      expensesMonth,
      netMonth: this.roundMoney(incomeMonth - expensesMonth),
      collectionRate,
      openIncidents,
      openTickets,
      reservations: activeReservations,
      occupancyRate: totalUnits ? this.roundMoney((occupiedUnits / totalUnits) * 100) : 0,
      totalUnits,
      occupiedUnits,
      vacantUnits: totalUnits - occupiedUnits,
      todayVisits,
      activeStaff,
      monthlyFinance,
      morosityByUnit,
      feeStatus,
      updatedAt: new Date().toISOString(),
    }
  }

  private buildMonthlyFinance (
    payments: Array<{ amount: unknown; paymentDate: Date }>,
    expenses: Array<{ amount: unknown; transactionDate: Date }>,
    now: Date,
  ) {
    const months = this.getLastMonths(6, now)
    return months.map(({ period, label, start, end }) => {
      const income = payments
        .filter((p) => p.paymentDate >= start && p.paymentDate <= end)
        .reduce((sum, p) => sum + this.moneyFromDecimal(p.amount), 0)
      const expenseTotal = expenses
        .filter((e) => e.transactionDate >= start && e.transactionDate <= end)
        .reduce((sum, e) => sum + this.moneyFromDecimal(e.amount), 0)
      return {
        period,
        label,
        income: this.roundMoney(income),
        expenses: this.roundMoney(expenseTotal),
      }
    })
  }

  private buildMorosityByUnit (
    fees: Array<{
      amount: unknown
      paidAmount: unknown
      unitId: string
      unit: {
        code: string
        ownerships: Array<{
          owner: {
            type: string
            firstName?: string | null
            lastName?: string | null
            legalName?: string | null
          }
        }>
      }
    }>,
  ) {
    const byUnit = new Map<string, {
      unitCode: string
      ownerName: string
      balance: number
      pendingCount: number
    }>()

    for (const fee of fees) {
      const balance = this.roundMoney(
        this.moneyFromDecimal(fee.amount) - this.moneyFromDecimal(fee.paidAmount),
      )
      if (balance <= 0) continue

      const owner = fee.unit.ownerships[0]?.owner
      const ownerName = owner
        ? owner.type === 'LEGAL'
          ? owner.legalName?.trim() || '—'
          : `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || '—'
        : '—'

      const prev = byUnit.get(fee.unitId)
      if (prev) {
        prev.balance = this.roundMoney(prev.balance + balance)
        prev.pendingCount += 1
      } else {
        byUnit.set(fee.unitId, {
          unitCode: fee.unit.code,
          ownerName,
          balance,
          pendingCount: 1,
        })
      }
    }

    return Array.from(byUnit.values())
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 8)
  }

  private buildFeeStatus (
    groups: Array<{ status: string; _count: { _all: number } }>,
  ) {
    const map = Object.fromEntries(groups.map((g) => [g.status, g._count._all]))
    return {
      pending: map.PENDING ?? 0,
      partial: map.PARTIAL ?? 0,
      overdue: map.OVERDUE ?? 0,
      paid: map.PAID ?? 0,
      cancelled: map.CANCELLED ?? 0,
    }
  }

  private getLastMonths (count: number, now: Date) {
    const months: Array<{ period: string; label: string; start: Date; end: Date }> = []
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ period, label: this.formatMonthLabel(period), start, end })
    }
    return months
  }

  private formatMonthLabel (period: string) {
    const [y, m] = period.split('-')
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${months[parseInt(m, 10) - 1] ?? m} ${y.slice(2)}`
  }

  private roundMoney (n: number) {
    return Math.round(n * 100) / 100
  }

  private moneyFromDecimal (value: unknown) {
    if (value == null) return 0
    if (typeof value === 'object' && value !== null && 'toNumber' in value) {
      const n = (value as { toNumber: () => number }).toNumber()
      return Number.isFinite(n) ? this.roundMoney(n) : 0
    }
    const n = Number(value)
    return Number.isFinite(n) ? this.roundMoney(n) : 0
  }
}

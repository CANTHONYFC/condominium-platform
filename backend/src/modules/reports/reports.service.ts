import { Injectable } from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantScopeService } from '../../common/services/tenant-scope.service'
import { IncomeExpenseReportQueryDto } from './dto/income-expense-report.dto'

@Injectable()
export class ReportsService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly scope: TenantScopeService,
  ) {}

  async incomeExpenseReport (tenantId: string, query: IncomeExpenseReportQueryDto) {
    const { condominiumId, from, to } = query
    if (condominiumId) {
      await this.scope.assertCondominium(tenantId, condominiumId)
    }

    const paymentDateFilter = from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        }
      : undefined

    const transactionDateFilter = paymentDateFilter

    const [payments, expenses, incomeTransactions] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(paymentDateFilter ? { paymentDate: paymentDateFilter } : {}),
          ...(condominiumId
            ? { maintenanceFee: { condominiumId, deletedAt: null } }
            : {}),
        },
        orderBy: { paymentDate: 'desc' },
        include: {
          maintenanceFee: {
            select: {
              period: true,
              unit: { select: { code: true, condominiumId: true } },
            },
          },
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          tenantId,
          deletedAt: null,
          type: 'EXPENSE',
          ...(condominiumId ? { condominiumId } : {}),
          ...(transactionDateFilter ? { transactionDate: transactionDateFilter } : {}),
        },
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.transaction.findMany({
        where: {
          tenantId,
          deletedAt: null,
          type: 'INCOME',
          ...(condominiumId ? { condominiumId } : {}),
          ...(transactionDateFilter ? { transactionDate: transactionDateFilter } : {}),
        },
        orderBy: { transactionDate: 'desc' },
      }),
    ])

    const incomeRows = [
      ...payments.map((p) => ({
        id: p.id,
        kind: 'INCOME' as const,
        date: p.paymentDate.toISOString(),
        label: p.maintenanceFee?.unit?.code
          ? `Cuota ${p.maintenanceFee.unit.code} · ${p.maintenanceFee.period}`
          : 'Pago de cuota',
        category: 'cuotas',
        amount: Number(p.amount),
        reference: p.reference ?? undefined,
      })),
      ...incomeTransactions.map((t) => ({
        id: t.id,
        kind: 'INCOME' as const,
        date: t.transactionDate.toISOString(),
        label: t.description ?? t.category,
        category: t.category,
        amount: Number(t.amount),
        reference: t.receiptNumber ?? undefined,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const expenseRows = expenses.map((t) => ({
      id: t.id,
      kind: 'EXPENSE' as const,
      date: t.transactionDate.toISOString(),
      label: t.description ?? t.category,
      category: t.category,
      amount: Number(t.amount),
      vendor: t.vendor ?? undefined,
      reference: t.receiptNumber ?? undefined,
      fromMaintenance: !!t.calendarEventId,
    }))

    const totalIncome = incomeRows.reduce((s, r) => s + r.amount, 0)
    const totalExpense = expenseRows.reduce((s, r) => s + r.amount, 0)

    const expensesByCategory = Object.entries(
      expenseRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.category] = (acc[row.category] ?? 0) + row.amount
        return acc
      }, {}),
    )
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)

    return {
      summary: {
        totalIncome: this.roundMoney(totalIncome),
        totalExpense: this.roundMoney(totalExpense),
        balance: this.roundMoney(totalIncome - totalExpense),
        incomeCount: incomeRows.length,
        expenseCount: expenseRows.length,
      },
      income: incomeRows,
      expenses: expenseRows,
      expensesByCategory,
    }
  }

  private roundMoney (value: number) {
    return Math.round(value * 100) / 100
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { Prisma } from '../../../generated/prisma'
import * as fs from 'fs'
import * as path from 'path'

import { renderAccountStatementPdf, buildStatementForPdfMode } from './statement-pdf.builder'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantScopeService } from '../../common/services/tenant-scope.service'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import {
  AccountStatementQueryDto,
  CreateMaintenanceFeeDto,
  CreatePaymentDto,
  GenerateFeesDto,
} from './dto/finance.dto'
import { PaymentStatus } from '../../../generated/prisma'

@Injectable()
export class FinanceService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly scope: TenantScopeService,
  ) {}

  async findFees (
    tenantId: string,
    query: PaginationQueryDto,
    condominiumId?: string,
    unitId?: string,
    status?: PaymentStatus,
  ) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = {
      tenantId,
      deletedAt: null,
      ...(condominiumId ? { condominiumId } : {}),
      ...(unitId ? { unitId } : {}),
      ...(status ? { status } : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.maintenanceFee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'desc' },
        include: {
          unit: { select: { id: true, code: true } },
          payments: { where: { deletedAt: null } },
        },
      }),
      this.prisma.maintenanceFee.count({ where }),
    ])
    return buildPaginatedResult(data, total, page, limit)
  }

  async createFee (tenantId: string, condominiumId: string, dto: CreateMaintenanceFeeDto) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const unit = await this.scope.assertUnit(tenantId, dto.unitId)
    if (unit.condominiumId !== condominiumId) {
      throw new BadRequestException('Unit does not belong to this condominium')
    }
    return this.prisma.maintenanceFee.create({
      data: {
        tenantId,
        condominiumId,
        unitId: dto.unitId,
        period: dto.period,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
      },
    })
  }

  async generateFeesBulk (tenantId: string, dto: GenerateFeesDto) {
    await this.scope.assertCondominium(tenantId, dto.condominiumId)
    const units = await this.prisma.unit.findMany({
      where: { tenantId, condominiumId: dto.condominiumId, deletedAt: null },
    })
    const created = []
    for (const unit of units) {
      const existing = await this.prisma.maintenanceFee.findFirst({
        where: {
          tenantId,
          unitId: unit.id,
          period: dto.period,
          deletedAt: null,
        },
      })
      if (existing) continue
      const fee = await this.prisma.maintenanceFee.create({
        data: {
          tenantId,
          condominiumId: dto.condominiumId,
          unitId: unit.id,
          period: dto.period,
          amount: unit.maintenanceFee,
          dueDate: new Date(dto.dueDate),
        },
      })
      created.push(fee)
    }
    return { created: created.length, fees: created }
  }

  async registerPayment (tenantId: string, dto: CreatePaymentDto) {
    if (dto.maintenanceFeeId) {
      const fee = await this.prisma.maintenanceFee.findFirst({
        where: { id: dto.maintenanceFeeId, tenantId, deletedAt: null },
      })
      if (!fee) throw new NotFoundException('Maintenance fee not found')

      const balance = this.roundMoney(
        this.moneyFromDecimal(fee.amount) - this.moneyFromDecimal(fee.paidAmount),
      )
      if (balance <= 0) {
        throw new BadRequestException('La cuota seleccionada ya está pagada')
      }
      if (dto.amount > balance + 0.009) {
        throw new BadRequestException(`El monto excede el saldo pendiente (S/ ${balance.toFixed(2)})`)
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        maintenanceFeeId: dto.maintenanceFeeId,
        amount: dto.amount,
        method: dto.method,
        reference: dto.reference,
        notes: dto.notes,
        attachmentUrl: dto.attachmentUrl,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
      },
    })

    if (dto.maintenanceFeeId) {
      await this.applyPaymentToFee(tenantId, dto.maintenanceFeeId)
    }

    return payment
  }

  async findPayments (tenantId: string, query: PaginationQueryDto, unitId?: string) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = {
      tenantId,
      deletedAt: null,
      ...(unitId
        ? { maintenanceFee: { unitId } }
        : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          maintenanceFee: { include: { unit: { select: { code: true } } } },
        },
      }),
      this.prisma.payment.count({ where }),
    ])
    return buildPaginatedResult(data, total, page, limit)
  }

  async getUnitPendingFees (tenantId: string, unitId: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, tenantId, deletedAt: null },
      include: {
        ownerships: {
          where: { deletedAt: null, isPrimary: true },
          include: { owner: true },
          take: 1,
        },
      },
    })
    if (!unit) throw new NotFoundException('Unit not found')

    const fees = await this.prisma.maintenanceFee.findMany({
      where: {
        tenantId,
        unitId,
        deletedAt: null,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      orderBy: [{ dueDate: 'asc' }, { period: 'asc' }],
    })

    const items = fees
      .map((fee) => {
        const amount = this.moneyFromDecimal(fee.amount)
        const paid = this.moneyFromDecimal(fee.paidAmount)
        const balance = this.roundMoney(amount - paid)
        return {
          id: fee.id,
          period: fee.period,
          periodLabel: this.formatPeriodLabel(fee.period),
          amount,
          paid,
          balance,
          dueDate: fee.dueDate.toISOString(),
          status: fee.status,
        }
      })
      .filter((item) => item.balance > 0)

    const owner = unit.ownerships[0]?.owner

    return {
      unit: { id: unit.id, code: unit.code },
      owner: owner
        ? {
            name: this.formatOwnerName(owner),
            phone: owner.phone ?? null,
            email: owner.email ?? null,
          }
        : null,
      totalDebt: this.roundMoney(items.reduce((sum, item) => sum + item.balance, 0)),
      items,
    }
  }

  async getOwnedUnitAccountSummaries (
    tenantId: string,
    condominiumId: string,
    query: PaginationQueryDto,
  ) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const { page, limit, skip } = getPaginationParams(query)
    const search = query.search?.trim()

    const where = {
      tenantId,
      condominiumId,
      deletedAt: null,
      ownerships: {
        some: { deletedAt: null, isPrimary: true },
      },
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' as const } },
              {
                ownerships: {
                  some: {
                    deletedAt: null,
                    isPrimary: true,
                    owner: {
                      OR: [
                        { firstName: { contains: search, mode: 'insensitive' as const } },
                        { lastName: { contains: search, mode: 'insensitive' as const } },
                        { legalName: { contains: search, mode: 'insensitive' as const } },
                        { email: { contains: search, mode: 'insensitive' as const } },
                        { phone: { contains: search, mode: 'insensitive' as const } },
                        { documentNumber: { contains: search, mode: 'insensitive' as const } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    }

    const [units, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        include: {
          ownerships: {
            where: { deletedAt: null, isPrimary: true },
            include: { owner: true },
            take: 1,
          },
          maintenanceFees: {
            where: { deletedAt: null },
            orderBy: { period: 'desc' },
          },
        },
      }),
      this.prisma.unit.count({ where }),
    ])

    const data = units.map((unit) => {
      const owner = unit.ownerships[0]?.owner
      const fees = unit.maintenanceFees
      const paidFees = fees.filter((f) => f.status === 'PAID')
      const pendingFees = fees.filter((f) => f.status !== 'PAID')
      const totalDebt = pendingFees.reduce(
        (s, f) => s + (Number(f.amount) - Number(f.paidAmount)),
        0,
      )

      return {
        unitId: unit.id,
        unitCode: unit.code,
        owner: owner
          ? {
              id: owner.id,
              name: this.formatOwnerName(owner),
              phone: owner.phone ?? null,
              email: owner.email ?? null,
            }
          : null,
        paidPeriods: paidFees.map((f) => f.period).sort(),
        paidPeriodsLabel: paidFees
          .map((f) => this.formatPeriodLabel(f.period))
          .sort()
          .join(', ') || '—',
        pendingDebts: pendingFees.map((f) => ({
          period: f.period,
          periodLabel: this.formatPeriodLabel(f.period),
          amount: Number(f.amount),
          paidAmount: Number(f.paidAmount),
          balance: Number(f.amount) - Number(f.paidAmount),
          status: f.status,
          dueDate: f.dueDate,
        })),
        totalDebt: this.roundMoney(totalDebt),
        hasMorosity: totalDebt > 0,
        status: totalDebt > 0 ? 'MORA' : 'AL_DIA',
        statusLabel: totalDebt > 0
          ? `Deuda S/ ${this.roundMoney(totalDebt).toFixed(2)}`
          : 'Al día',
      }
    })

    return buildPaginatedResult(data, total, page, limit)
  }

  async getAccountStatement (
    tenantId: string,
    unitId: string,
    query: AccountStatementQueryDto,
  ) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, tenantId, deletedAt: null },
      include: {
        ownerships: {
          where: { deletedAt: null, isPrimary: true },
          include: { owner: true },
          take: 1,
        },
      },
    })
    if (!unit) throw new NotFoundException('Unit not found')
    const periodFilter =
      query.fromPeriod && query.toPeriod
        ? { period: { gte: query.fromPeriod, lte: query.toPeriod } }
        : query.fromPeriod
          ? { period: { gte: query.fromPeriod } }
          : query.toPeriod
            ? { period: { lte: query.toPeriod } }
            : {}

    const fees = await this.prisma.maintenanceFee.findMany({
      where: {
        tenantId,
        unitId,
        deletedAt: null,
        ...periodFilter,
      },
      orderBy: { period: 'asc' },
      include: {
        payments: { where: { deletedAt: null } },
        chargeLines: {
          include: {
            chargeConcept: { select: { code: true, name: true, type: true, sortOrder: true } },
          },
          orderBy: { chargeConcept: { sortOrder: 'asc' } },
        },
      },
    })

    const totalCharged = fees.reduce((s, f) => s + Number(f.amount), 0)
    const totalPaid = fees.reduce((s, f) => s + Number(f.paidAmount), 0)
    const balance = totalCharged - totalPaid
    const owner = unit.ownerships[0]?.owner
    const paidFees = fees.filter((f) => f.status === 'PAID')
    const pendingFees = fees.filter((f) => f.status !== 'PAID')

    return {
      unit: { id: unit.id, code: unit.code, condominiumId: unit.condominiumId },
      owner: owner
        ? {
            id: owner.id,
            name: this.formatOwnerName(owner),
            phone: owner.phone ?? null,
            email: owner.email ?? null,
          }
        : null,
      summary: {
        totalCharged,
        totalPaid,
        balance,
        pendingFees: pendingFees.length,
      },
      paidPeriods: paidFees.map((f) => ({
        period: f.period,
        label: this.formatPeriodLabel(f.period),
        amount: Number(f.amount),
      })),
      pendingDebts: pendingFees.map((f) => ({
        period: f.period,
        label: this.formatPeriodLabel(f.period),
        amount: Number(f.amount),
        paidAmount: Number(f.paidAmount),
        balance: Number(f.amount) - Number(f.paidAmount),
        status: f.status,
        dueDate: f.dueDate,
      })),
      fees: fees.map((f) => ({
        id: f.id,
        period: f.period,
        amount: Number(f.amount),
        paidAmount: Number(f.paidAmount),
        balance: Number(f.amount) - Number(f.paidAmount),
        status: f.status,
        dueDate: f.dueDate,
        concepts: f.chargeLines.map((l) => ({
          code: l.chargeConcept.code,
          name: l.chargeConcept.name,
          type: l.chargeConcept.type,
          amount: Number(l.amount),
        })),
        payments: f.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          paymentDate: p.paymentDate,
          reference: p.reference,
        })),
      })),
    }
  }

  async generateStatementPdf (tenantId: string, unitId: string, query: AccountStatementQueryDto) {
    const fullStatement = await this.getAccountStatement(tenantId, unitId, query)
    const mode = query.mode === 'history' ? 'history' : 'latest'
    const statement = buildStatementForPdfMode(fullStatement, mode)
    const condo = await this.prisma.condominium.findFirst({
      where: { id: fullStatement.unit.condominiumId, tenantId },
      include: { tenant: { select: { name: true } } },
    })

    const uploadsDir = path.join(process.cwd(), 'uploads', 'statements')
    fs.mkdirSync(uploadsDir, { recursive: true })

    const filename = `statement-${mode}-${unitId}-${Date.now()}.pdf`
    const filePath = path.join(uploadsDir, filename)

    await renderAccountStatementPdf(filePath, statement, {
      buildingName: condo?.name ?? 'Edificio',
      buildingCode: condo?.code ?? '',
      organizationName: condo?.tenant?.name ?? 'Condominium.co',
    }, { mode })

    const fileUrl = `/uploads/statements/${filename}`
    return { fileUrl, statement: statement.summary, mode }
  }

  async getMorosityReport (tenantId: string, condominiumId: string) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const overdue = await this.prisma.maintenanceFee.findMany({
      where: {
        tenantId,
        condominiumId,
        deletedAt: null,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        unit: {
          select: {
            id: true,
            code: true,
            ownerships: {
              where: { deletedAt: null, isPrimary: true },
              include: { owner: true },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { period: 'asc' }],
    })

    const items = overdue.map((f) => {
      const owner = f.unit.ownerships[0]?.owner
      const amount = this.moneyFromDecimal(f.amount)
      const paid = this.moneyFromDecimal(f.paidAmount)
      const balance = this.roundMoney(amount - paid)
      return {
        unitId: f.unit.id,
        unitCode: f.unit.code,
        ownerName: owner ? this.formatOwnerName(owner) : '—',
        ownerPhone: owner?.phone ?? null,
        ownerEmail: owner?.email ?? null,
        period: f.period,
        periodLabel: this.formatPeriodLabel(f.period),
        amount,
        paid,
        balance,
        dueDate: f.dueDate.toISOString(),
        status: f.status,
      }
    })

    return {
      total: items.length,
      totalDebt: this.roundMoney(items.reduce((s, i) => s + i.balance, 0)),
      items,
    }
  }

  private formatOwnerName (owner: {
    type: string
    firstName?: string | null
    lastName?: string | null
    legalName?: string | null
  }) {
    if (owner.type === 'LEGAL') return owner.legalName?.trim() || '—'
    return `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || '—'
  }

  private formatPeriodLabel (period: string) {
    const [y, m] = period.split('-')
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const idx = parseInt(m, 10) - 1
    return `${months[idx] ?? m} ${y}`
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

  private async applyPaymentToFee (tenantId: string, feeId: string) {
    const fee = await this.prisma.maintenanceFee.findFirst({
      where: { id: feeId, tenantId, deletedAt: null },
    })
    if (!fee) throw new NotFoundException('Maintenance fee not found')

    const payments = await this.prisma.payment.aggregate({
      where: { maintenanceFeeId: feeId, tenantId, deletedAt: null },
      _sum: { amount: true },
    })

    const paidAmount = payments._sum.amount ?? new Prisma.Decimal(0)
    const amount = fee.amount
    let status: PaymentStatus = 'PENDING'

    if (paidAmount.gte(amount)) status = 'PAID'
    else if (paidAmount.gt(0)) status = 'PARTIAL'
    else if (fee.dueDate < new Date()) status = 'OVERDUE'

    await this.prisma.maintenanceFee.update({
      where: { id: feeId },
      data: { paidAmount, status },
    })
  }
}

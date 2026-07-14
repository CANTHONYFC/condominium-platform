import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantScopeService } from '../../common/services/tenant-scope.service'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto'

@Injectable()
export class ExpensesService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly scope: TenantScopeService,
  ) {}

  async findAll (
    tenantId: string,
    query: PaginationQueryDto,
    condominiumId?: string,
    from?: string,
    to?: string,
  ) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = {
      tenantId,
      type: 'EXPENSE' as const,
      deletedAt: null,
      ...(condominiumId ? { condominiumId } : {}),
      ...(from || to
        ? {
            transactionDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    }
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ])
    return buildPaginatedResult(data, total, page, limit)
  }

  async create (tenantId: string, dto: CreateExpenseDto) {
    await this.scope.assertCondominium(tenantId, dto.condominiumId)
    return this.prisma.transaction.create({
      data: {
        tenantId,
        condominiumId: dto.condominiumId,
        type: 'EXPENSE',
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        vendor: dto.vendor,
        receiptNumber: dto.receiptNumber,
        attachmentUrl: dto.attachmentUrl,
        transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
      },
    })
  }

  async findOne (tenantId: string, id: string) {
    const item = await this.prisma.transaction.findFirst({
      where: { id, tenantId, type: 'EXPENSE', deletedAt: null },
    })
    if (!item) throw new NotFoundException('Expense not found')
    return item
  }

  async update (tenantId: string, id: string, dto: UpdateExpenseDto) {
    const existing = await this.findOne(tenantId, id)
    if (existing.calendarEventId) {
      throw new BadRequestException('Este egreso proviene de un mantenimiento y solo puede editarse desde Mantenimiento')
    }
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.vendor !== undefined ? { vendor: dto.vendor } : {}),
        ...(dto.receiptNumber !== undefined ? { receiptNumber: dto.receiptNumber } : {}),
        ...(dto.attachmentUrl !== undefined ? { attachmentUrl: dto.attachmentUrl } : {}),
        ...(dto.transactionDate ? { transactionDate: new Date(dto.transactionDate) } : {}),
      },
    })
  }

  async remove (tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id)
    if (existing.calendarEventId) {
      throw new BadRequestException('Este egreso proviene de un mantenimiento y solo puede eliminarse desde Mantenimiento')
    }
    return this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async summary (tenantId: string, condominiumId: string, from?: string, to?: string) {
    await this.scope.assertCondominium(tenantId, condominiumId)
    const where = {
      tenantId,
      condominiumId,
      type: 'EXPENSE' as const,
      deletedAt: null,
      ...(from || to
        ? {
            transactionDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    }
    const agg = await this.prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    })
    return {
      total: agg._count,
      totalAmount: Number(agg._sum.amount ?? 0),
    }
  }
}

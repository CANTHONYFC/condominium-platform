import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import type { Queue } from 'bull'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { TenantScopeService } from '../../common/services/tenant-scope.service'
import { FinanceService } from '../finance/finance.service'
import { EMAIL_QUEUE, EmailJobPayload } from './email.constants'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import * as path from 'path'

export interface QueueStatementsDto {
  onlyMorosity?: boolean
}

@Injectable()
export class StatementEmailService {
  constructor (
    private readonly prisma: PrismaService,
    private readonly scope: TenantScopeService,
    private readonly finance: FinanceService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobPayload>,
  ) {}

  async queueStatements (
    tenantId: string,
    condominiumId: string,
    dto: QueueStatementsDto,
  ) {
    await this.scope.assertCondominium(tenantId, condominiumId)

    const units = await this.prisma.unit.findMany({
      where: { tenantId, condominiumId, deletedAt: null },
      include: {
        ownerships: {
          where: { endDate: null },
          include: { owner: true },
        },
      },
    })

    let queued = 0
    for (const unit of units) {
      const queuedOne = await this.queueStatementForUnit(
        tenantId,
        unit,
        dto.onlyMorosity ?? false,
      )
      if (queuedOne) queued++
    }

    return { queued, onlyMorosity: dto.onlyMorosity ?? false }
  }

  async queueMorosityForAllTenants () {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true, deletedAt: null },
    })

    let totalQueued = 0
    let condominiumsProcessed = 0

    for (const tenant of tenants) {
      const condominiums = await this.prisma.condominium.findMany({
        where: { tenantId: tenant.id, deletedAt: null },
      })

      for (const condominium of condominiums) {
        const result = await this.queueStatements(tenant.id, condominium.id, {
          onlyMorosity: true,
        })
        totalQueued += result.queued
        condominiumsProcessed++
      }
    }

    return { totalQueued, condominiumsProcessed }
  }

  private async queueStatementForUnit (
    tenantId: string,
    unit: {
      id: string
      code: string
      ownerships: Array<{
        isPrimary: boolean
        owner: { id: string; email: string | null } | null
      }>
    },
    onlyMorosity: boolean,
  ) {
    const statement = await this.finance.getAccountStatement(tenantId, unit.id, {})
    if (onlyMorosity && statement.summary.balance <= 0) return false

    const primaryOwner = unit.ownerships.find((o) => o.isPrimary)?.owner
      ?? unit.ownerships[0]?.owner
    if (!primaryOwner?.email) return false

    const pdf = await this.finance.generateStatementPdf(tenantId, unit.id, {})
    const subject = statement.summary.balance > 0
      ? `Estado de cuenta — Unidad ${unit.code} — Saldo pendiente S/ ${statement.summary.balance.toFixed(2)}`
      : `Estado de cuenta — Unidad ${unit.code}`

    const job = await this.prisma.emailJob.create({
      data: {
        tenantId,
        type: statement.summary.balance > 0 ? 'MOROSITY' : 'STATEMENT',
        recipientEmail: primaryOwner.email,
        ownerId: primaryOwner.id,
        unitId: unit.id,
        subject,
        metadata: {
          unitCode: unit.code,
          balance: statement.summary.balance,
          pdfUrl: pdf.fileUrl,
          source: onlyMorosity ? 'morosity-cron' : 'manual',
        },
      },
    })

    await this.emailQueue.add('send', { emailJobId: job.id, tenantId })
    return true
  }

  async listJobs (tenantId: string, query: PaginationQueryDto) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = { tenantId }
    const [data, total] = await Promise.all([
      this.prisma.emailJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailJob.count({ where }),
    ])
    return buildPaginatedResult(data, total, page, limit)
  }

  getPdfPath (fileUrl: string) {
    return path.join(process.cwd(), fileUrl.replace(/^\//, '').replace(/^uploads\//, 'uploads/'))
  }
}

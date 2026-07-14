import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import type { Queue } from 'bull'

import { Prisma } from '../../../generated/prisma'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'
import { CreateExportDto } from './dto/export.dto'
import { EXPORT_QUEUE } from './export.processor'

@Injectable()
export class ExportsService {
  constructor (
    private readonly prisma: PrismaService,
    @InjectQueue(EXPORT_QUEUE) private readonly exportQueue: Queue,
  ) {}

  async create (tenantId: string, userId: string | undefined, dto: CreateExportDto) {
    const job = await this.prisma.exportJob.create({
      data: {
        tenantId,
        userId,
        module: dto.module,
        format: dto.format,
        filters: (dto.filters ?? {}) as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    })

    await this.exportQueue.add('generate', {
      jobId: job.id,
      tenantId,
      module: dto.module,
      format: dto.format,
      filters: dto.filters,
    })

    return job
  }

  async findOne (tenantId: string, id: string) {
    const job = await this.prisma.exportJob.findFirst({
      where: { id, tenantId },
    })
    if (!job) throw new NotFoundException('Export job not found')
    return job
  }

  async findAll (tenantId: string, query: PaginationQueryDto) {
    const { page, limit, skip } = getPaginationParams(query)
    const where = { tenantId }
    const [data, total] = await Promise.all([
      this.prisma.exportJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exportJob.count({ where }),
    ])
    return buildPaginatedResult(data, total, page, limit)
  }
}

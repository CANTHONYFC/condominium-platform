import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import type { Job } from 'bull'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { ExportGeneratorService, ExportJobPayload } from './export-generator.service'

export const EXPORT_QUEUE = 'exports'

@Processor(EXPORT_QUEUE)
export class ExportProcessor {
  private readonly logger = new Logger(ExportProcessor.name)

  constructor (
    private readonly prisma: PrismaService,
    private readonly generator: ExportGeneratorService,
  ) {}

  @Process('generate')
  async handleGenerate (job: Job<ExportJobPayload>) {
    const { jobId, tenantId } = job.data
    this.logger.log({ msg: 'Processing export', jobId, module: job.data.module })

    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    })

    try {
      const fileUrl = await this.generator.generate(job.data)
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          fileUrl,
          completedAt: new Date(),
        },
      })
      return { fileUrl }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', error: message },
      })
      throw err
    }
  }
}

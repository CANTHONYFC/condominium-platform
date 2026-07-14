import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import type { Job } from 'bull'
import * as path from 'path'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { MailerService } from './mailer.service'
import { EMAIL_QUEUE, EmailJobPayload } from './email.constants'

@Processor(EMAIL_QUEUE)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name)

  constructor (
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  @Process('send')
  async handleSend (job: Job<EmailJobPayload>) {
    const { emailJobId } = job.data
    const emailJob = await this.prisma.emailJob.findUnique({ where: { id: emailJobId } })
    if (!emailJob) return

    await this.prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: 'PROCESSING' },
    })

    try {
      const metadata = emailJob.metadata as { unitCode?: string; balance?: number; pdfUrl?: string } | null
      const balance = metadata?.balance ?? 0
      const unitCode = metadata?.unitCode ?? '—'
      const pdfUrl = metadata?.pdfUrl

      const html = balance > 0
        ? `<p>Estimado propietario,</p>
           <p>Adjuntamos el estado de cuenta de la unidad <strong>${unitCode}</strong>.</p>
           <p>Saldo pendiente: <strong>S/ ${balance.toFixed(2)}</strong></p>
           <p>Por favor regularice su situación a la brevedad.</p>`
        : `<p>Estimado propietario,</p>
           <p>Adjuntamos el estado de cuenta de la unidad <strong>${unitCode}</strong>.</p>`

      const attachments = pdfUrl
        ? [{
            filename: `estado-cuenta-${unitCode}.pdf`,
            path: path.join(process.cwd(), pdfUrl.replace(/^\//, '')),
          }]
        : undefined

      await this.mailer.sendMail({
        to: emailJob.recipientEmail,
        subject: emailJob.subject,
        html,
        attachments,
      })

      await this.prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: 'SENT', sentAt: new Date() },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email send failed'
      this.logger.error({ msg: 'Email job failed', emailJobId, err: message })
      await this.prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: 'FAILED', error: message },
      })
      throw err
    }
  }
}

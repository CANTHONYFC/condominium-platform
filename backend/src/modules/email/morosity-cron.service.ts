import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'

import { StatementEmailService } from './statement-email.service'
import { MailerService } from './mailer.service'

@Injectable()
export class MorosityCronService {
  private readonly logger = new Logger(MorosityCronService.name)

  constructor (
    private readonly config: ConfigService,
    private readonly statementEmail: StatementEmailService,
    private readonly mailer: MailerService,
  ) {}

  @Cron(process.env.MOROSITY_CRON_SCHEDULE ?? '0 8 * * *')
  async runDailyMorosityEmails () {
    if (!this.config.get<boolean>('morosityCron.enabled')) {
      return
    }
    if (!this.mailer.isConfigured()) {
      this.logger.warn({ msg: 'Morosity cron skipped — SMTP not configured' })
      return
    }

    this.logger.log({ msg: 'Morosity cron started' })
    try {
      const result = await this.statementEmail.queueMorosityForAllTenants()
      this.logger.log({
        msg: 'Morosity cron completed',
        count: result.totalQueued,
        condominiums: result.condominiumsProcessed,
      })
    } catch (err) {
      this.logger.error({ msg: 'Morosity cron failed', err })
    }
  }
}

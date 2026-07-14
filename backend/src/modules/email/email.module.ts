import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'

import { FinanceModule } from '../finance/finance.module'
import { EmailController } from './email.controller'
import { MailerService } from './mailer.service'
import { MorosityCronService } from './morosity-cron.service'
import { StatementEmailService } from './statement-email.service'
import { EMAIL_QUEUE } from './email.constants'
import { EmailProcessor } from './email.processor'

@Module({
  imports: [
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
    FinanceModule,
  ],
  controllers: [EmailController],
  providers: [MailerService, StatementEmailService, MorosityCronService, EmailProcessor],
  exports: [MailerService, StatementEmailService],
})
export class EmailModule {}

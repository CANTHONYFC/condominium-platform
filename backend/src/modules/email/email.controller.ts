import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { StatementEmailService } from './statement-email.service'
import { MailerService } from './mailer.service'
import { MorosityCronService } from './morosity-cron.service'
import { SendStatementsDto } from './dto/email.dto'

@ApiTags('Email')
@ApiBearerAuth()
@Controller('email')
export class EmailController {
  constructor (
    private readonly statements: StatementEmailService,
    private readonly mailer: MailerService,
    private readonly morosityCron: MorosityCronService,
  ) {}

  @Post('condominiums/:condominiumId/send-statements')
  @RequirePermissions('finance:create')
  @ApiOperation({ summary: 'Encolar envío de estados de cuenta por correo (job Bull)' })
  sendStatements (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Body() dto: SendStatementsDto,
  ) {
    return this.statements.queueStatements(tenantId, condominiumId, dto)
  }

  @Post('cron/morosity/run-now')
  @RequirePermissions('finance:create')
  @ApiOperation({ summary: 'Ejecutar ahora el job de morosidad (todos los tenants)' })
  async runMorosityCronNow () {
    await this.morosityCron.runDailyMorosityEmails()
    return { ok: true }
  }

  @Get('jobs')
  @RequirePermissions('finance:read')
  listJobs (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.statements.listJobs(tenantId, query)
  }

  @Get('status')
  @RequirePermissions('settings:read')
  smtpStatus () {
    return {
      configured: this.mailer.isConfigured(),
      morosityCron: {
        enabled: process.env.MOROSITY_CRON_ENABLED !== 'false',
        schedule: process.env.MOROSITY_CRON_SCHEDULE ?? '0 8 * * *',
        description: 'Envío diario de estados de cuenta a propietarios morosos (8:00 AM por defecto)',
      },
    }
  }
}

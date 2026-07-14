import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { IncomeExpenseReportQueryDto } from './dto/income-expense-report.dto'
import { ReportsService } from './reports.service'

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor (private readonly service: ReportsService) {}

  @Get('income-expense')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Reporte de ingresos y egresos' })
  incomeExpense (
    @TenantId() tenantId: string,
    @Query() query: IncomeExpenseReportQueryDto,
  ) {
    return this.service.incomeExpenseReport(tenantId, query)
  }
}

import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { DashboardService } from './dashboard.service'

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor (private readonly service: DashboardService) {}

  @Get('kpis')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'KPIs ejecutivos en tiempo real' })
  getKpis (
    @TenantId() tenantId: string,
    @Query('condominiumId') condominiumId?: string,
  ) {
    return this.service.getExecutiveKpis(tenantId, condominiumId)
  }
}

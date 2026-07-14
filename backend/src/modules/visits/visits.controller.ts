import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { VisitsService } from './visits.service'

@ApiTags('Visits')
@ApiBearerAuth()
@Controller('visits')
export class VisitsController {
  constructor (private readonly service: VisitsService) {}

  @Get()
  @RequirePermissions('visits:read')
  @ApiOperation({ summary: 'Listar visits' })
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }
}

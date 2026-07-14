import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { StaffService } from './staff.service'

@ApiTags('Staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor (private readonly service: StaffService) {}

  @Get()
  @RequirePermissions('staff:read')
  @ApiOperation({ summary: 'Listar staff' })
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }
}

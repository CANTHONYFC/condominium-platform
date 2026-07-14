import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { UnitsService } from './units.service'

@ApiTags('Units')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor (private readonly service: UnitsService) {}

  @Get()
  @RequirePermissions('units:read')
  @ApiOperation({ summary: 'Listar units' })
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }
}

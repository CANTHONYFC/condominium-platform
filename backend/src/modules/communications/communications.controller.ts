import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { CommunicationsService } from './communications.service'

@ApiTags('Communications')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor (private readonly service: CommunicationsService) {}

  @Get()
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Listar communications' })
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }
}

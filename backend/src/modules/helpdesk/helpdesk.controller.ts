import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { HelpdeskService } from './helpdesk.service'

@ApiTags('Helpdesk')
@ApiBearerAuth()
@Controller('helpdesk')
export class HelpdeskController {
  constructor (private readonly service: HelpdeskService) {}

  @Get()
  @RequirePermissions('helpdesk:read')
  @ApiOperation({ summary: 'Listar helpdesk' })
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }
}

import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { CorrespondenceService } from './correspondence.service'

@ApiTags('Correspondence')
@ApiBearerAuth()
@Controller('correspondence')
export class CorrespondenceController {
  constructor (private readonly service: CorrespondenceService) {}

  @Get()
  @RequirePermissions('correspondence:read')
  @ApiOperation({ summary: 'Listar correspondence' })
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }
}

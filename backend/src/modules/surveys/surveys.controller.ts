import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { SurveysService } from './surveys.service'

@ApiTags('Surveys')
@ApiBearerAuth()
@Controller('surveys')
export class SurveysController {
  constructor (private readonly service: SurveysService) {}

  @Get()
  @RequirePermissions('surveys:read')
  @ApiOperation({ summary: 'Listar surveys' })
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }
}

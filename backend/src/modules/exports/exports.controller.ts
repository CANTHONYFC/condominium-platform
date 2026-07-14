import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import {
  CurrentUser,
  RequirePermissions,
  TenantId,
  type AuthenticatedUser,
} from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { ExportsService } from './exports.service'
import { CreateExportDto } from './dto/export.dto'

@ApiTags('Exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor (private readonly service: ExportsService) {}

  @Post()
  @RequirePermissions('exports:create')
  @ApiOperation({ summary: 'Encolar exportación Excel/PDF' })
  create (
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExportDto,
  ) {
    return this.service.create(tenantId, user.sub, dto)
  }

  @Get()
  @RequirePermissions('exports:read')
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }

  @Get(':id')
  @RequirePermissions('exports:read')
  findOne (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id)
  }
}

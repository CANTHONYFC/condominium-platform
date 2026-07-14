import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { CommonAreasService } from './common-areas.service'
import {
  CreateBlockDto,
  CreateCommonAreaDto,
  UpdateBlockDto,
  UpdateCommonAreaDto,
  UpsertScheduleDto,
} from './dto/common-area.dto'

@ApiTags('Common Areas')
@ApiBearerAuth()
@Controller()
export class CommonAreasController {
  constructor (private readonly service: CommonAreasService) {}

  @Get('condominiums/:condominiumId/common-areas')
  @RequirePermissions('reservations:read')
  listByCondominium (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
  ) {
    return this.service.listByCondominium(tenantId, condominiumId)
  }

  @Post('condominiums/:condominiumId/common-areas')
  @RequirePermissions('reservations:create')
  create (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Body() dto: CreateCommonAreaDto,
  ) {
    return this.service.create(tenantId, condominiumId, dto)
  }

  @Get('common-areas/:id')
  @RequirePermissions('reservations:read')
  findOne (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id)
  }

  @Patch('common-areas/:id')
  @RequirePermissions('reservations:update')
  update (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCommonAreaDto,
  ) {
    return this.service.update(tenantId, id, dto)
  }

  @Delete('common-areas/:id')
  @RequirePermissions('reservations:delete')
  remove (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id)
  }

  @Put('common-areas/:id/schedules')
  @RequirePermissions('reservations:update')
  upsertSchedule (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpsertScheduleDto,
  ) {
    return this.service.upsertSchedule(tenantId, id, dto)
  }

  @Delete('common-areas/:id/schedules/:dayOfWeek')
  @RequirePermissions('reservations:update')
  removeSchedule (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('dayOfWeek') dayOfWeek: string,
  ) {
    return this.service.removeSchedule(tenantId, id, parseInt(dayOfWeek, 10))
  }

  @Get('common-areas/:id/blocks')
  @RequirePermissions('reservations:read')
  listBlocks (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.listBlocks(tenantId, id)
  }

  @Post('common-areas/:id/blocks')
  @RequirePermissions('reservations:update')
  createBlock (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateBlockDto,
  ) {
    return this.service.createBlock(tenantId, id, dto)
  }

  @Patch('common-areas/:id/blocks/:blockId')
  @RequirePermissions('reservations:update')
  updateBlock (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('blockId') blockId: string,
    @Body() dto: UpdateBlockDto,
  ) {
    return this.service.updateBlock(tenantId, id, blockId, dto)
  }

  @Delete('common-areas/:id/blocks/:blockId')
  @RequirePermissions('reservations:update')
  removeBlock (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('blockId') blockId: string,
  ) {
    return this.service.removeBlock(tenantId, id, blockId)
  }
}

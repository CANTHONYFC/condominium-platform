import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { CalendarService } from './calendar.service'
import { CalendarEventsQueryDto, CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto'

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor (private readonly service: CalendarService) {}

  @Get('events')
  @RequirePermissions('calendar:read')
  findAll (
    @TenantId() tenantId: string,
    @Query() query: CalendarEventsQueryDto,
  ) {
    return this.service.findAll(
      tenantId,
      query,
      query.condominiumId,
      query.type,
      query.from,
      query.to,
    )
  }

  @Get('maintenance/summary')
  @RequirePermissions('calendar:read')
  summary (
    @TenantId() tenantId: string,
    @Query('condominiumId') condominiumId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.maintenanceSummary(tenantId, condominiumId, from, to)
  }

  @Get('events/:id')
  @RequirePermissions('calendar:read')
  findOne (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id)
  }

  @Post('events')
  @RequirePermissions('calendar:create')
  create (@TenantId() tenantId: string, @Body() dto: CreateCalendarEventDto) {
    return this.service.create(tenantId, dto)
  }

  @Patch('events/:id')
  @RequirePermissions('calendar:update')
  update (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.service.update(tenantId, id, dto)
  }

  @Delete('events/:id')
  @RequirePermissions('calendar:delete')
  remove (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id)
  }
}

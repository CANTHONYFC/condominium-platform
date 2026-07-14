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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { ReservationsService } from './reservations.service'
import { ReservationsQueryDto } from './dto/reservations-query.dto'
import { CreateReservationDto, UpdateReservationDto } from './dto/reservation.dto'

@ApiTags('Reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  constructor (private readonly service: ReservationsService) {}

  @Get()
  @RequirePermissions('reservations:read')
  findAll (
    @TenantId() tenantId: string,
    @Query() query: ReservationsQueryDto,
  ) {
    return this.service.findAll(
      tenantId,
      query,
      query.condominiumId,
      query.commonAreaId,
      query.from,
      query.to,
    )
  }

  @Get('common-areas/:commonAreaId/availability')
  @RequirePermissions('reservations:read')
  @ApiOperation({ summary: 'Horarios disponibles para una fecha' })
  getAvailability (
    @TenantId() tenantId: string,
    @Param('commonAreaId') commonAreaId: string,
    @Query('date') date: string,
  ) {
    return this.service.getAvailability(tenantId, commonAreaId, date)
  }

  @Post()
  @RequirePermissions('reservations:create')
  create (@TenantId() tenantId: string, @Body() dto: CreateReservationDto) {
    return this.service.create(tenantId, dto)
  }

  @Patch(':id')
  @RequirePermissions('reservations:update')
  update (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.service.update(tenantId, id, dto)
  }

  @Delete(':id')
  @RequirePermissions('reservations:delete')
  cancel (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.cancel(tenantId, id)
  }
}

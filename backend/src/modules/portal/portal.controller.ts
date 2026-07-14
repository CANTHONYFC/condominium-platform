import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser, RequirePermissions, TenantId, type JwtPayload } from '../../common/decorators/auth.decorator'
import { PortalReservationsQueryDto } from './dto/portal-reservations-query.dto'
import { AccountStatementQueryDto } from '../finance/dto/finance.dto'
import { CreateReservationDto } from '../reservations/dto/reservation.dto'
import { PortalService } from './portal.service'

@ApiTags('Portal')
@ApiBearerAuth()
@Controller('portal')
export class PortalController {
  constructor (private readonly service: PortalService) {}

  @Get('context')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Contexto del portal (unidad y condominio)' })
  getContext (@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.service.resolveContext(tenantId, user.sub)
  }

  @Get('common-areas')
  @RequirePermissions('reservations:read')
  @ApiOperation({ summary: 'Áreas comunes del condominio del propietario' })
  listCommonAreas (@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.service.listMyCommonAreas(tenantId, user.sub)
  }

  @Get('home')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Inicio del portal propietario/residente' })
  getHome (@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.service.getHome(tenantId, user.sub)
  }

  @Get('reservations')
  @RequirePermissions('reservations:read')
  @ApiOperation({ summary: 'Reservas del usuario en portal' })
  getReservations (
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: PortalReservationsQueryDto,
  ) {
    return this.service.getMyReservations(tenantId, user.sub, query, query.from, query.to)
  }

  @Post('reservations')
  @RequirePermissions('reservations:create')
  @ApiOperation({ summary: 'Crear reserva en portal (asocia unidad y residente automáticamente)' })
  createReservation (
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReservationDto,
  ) {
    return this.service.createMyReservation(tenantId, user.sub, dto)
  }

  @Get('statement')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Estado de cuenta del propietario/residente' })
  getStatement (
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: AccountStatementQueryDto,
  ) {
    return this.service.getMyStatement(tenantId, user.sub, query)
  }
}

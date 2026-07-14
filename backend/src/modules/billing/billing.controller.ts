import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { BillingService } from './billing.service'
import {
  BillingGridQueryDto,
  PublishBillingSheetDto,
  UpdateBillingSheetDto,
  UpdateChargeConceptDto,
  UpdateChargeLinesDto,
} from './dto/billing.dto'

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor (private readonly service: BillingService) {}

  @Get('grid')
  @RequirePermissions('billing:read')
  @ApiOperation({ summary: 'Cuadro mensual de cobros (unidades × conceptos)' })
  getGrid (@TenantId() tenantId: string, @Query() query: BillingGridQueryDto) {
    return this.service.getOrCreateGrid(tenantId, query)
  }

  @Patch('concepts/:id/type')
  @RequirePermissions('billing:update')
  @ApiOperation({ summary: 'Cambiar concepto entre fijo y variable' })
  updateConceptType (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChargeConceptDto,
  ) {
    return this.service.updateConceptType(tenantId, id, dto)
  }

  @Patch('sheets/:id')
  @RequirePermissions('billing:update')
  @ApiOperation({ summary: 'Actualizar cuadro (totales fijos, vencimiento)' })
  updateSheet (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBillingSheetDto,
  ) {
    return this.service.updateSheet(tenantId, id, dto)
  }

  @Patch('sheets/:id/lines')
  @RequirePermissions('billing:update')
  @ApiOperation({ summary: 'Actualizar montos variables por unidad' })
  updateLines (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChargeLinesDto,
  ) {
    return this.service.updateLines(tenantId, id, dto)
  }

  @Post('sheets/:id/recalculate')
  @RequirePermissions('billing:update')
  @ApiOperation({ summary: 'Repartir conceptos fijos entre unidades' })
  recalculate (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.recalculate(tenantId, id)
  }

  @Post('sheets/:id/publish')
  @RequirePermissions('billing:create')
  @ApiOperation({ summary: 'Publicar cuotas del periodo' })
  publish (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: PublishBillingSheetDto,
  ) {
    return this.service.publish(tenantId, id, dto)
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common'

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { FinanceService } from './finance.service'
import {
  AccountStatementQueryDto,
  CreateMaintenanceFeeDto,
  CreatePaymentDto,
  GenerateFeesDto,
} from './dto/finance.dto'
import { PaymentStatus } from '../../../generated/prisma'

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor (private readonly service: FinanceService) {}

  @Get('fees')
  @RequirePermissions('finance:read')
  findFees (
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
    @Query('condominiumId') condominiumId?: string,
    @Query('unitId') unitId?: string,
    @Query('status') status?: PaymentStatus,
  ) {
    return this.service.findFees(tenantId, query, condominiumId, unitId, status)
  }

  @Post('condominiums/:condominiumId/fees')
  @RequirePermissions('finance:create')
  createFee (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Body() dto: CreateMaintenanceFeeDto,
  ) {
    return this.service.createFee(tenantId, condominiumId, dto)
  }

  @Post('fees/generate')
  @RequirePermissions('finance:create')
  generateFees (@TenantId() tenantId: string, @Body() dto: GenerateFeesDto) {
    return this.service.generateFeesBulk(tenantId, dto)
  }

  @Get('payments')
  @RequirePermissions('finance:read')
  findPayments (
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
    @Query('unitId') unitId?: string,
  ) {
    return this.service.findPayments(tenantId, query, unitId)
  }

  @Post('payments')
  @RequirePermissions('finance:create')
  registerPayment (@TenantId() tenantId: string, @Body() dto: CreatePaymentDto) {
    return this.service.registerPayment(tenantId, dto)
  }

  @Get('units/:unitId/pending-fees')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Cuotas pendientes de una unidad para registrar pagos' })
  getUnitPendingFees (
    @TenantId() tenantId: string,
    @Param('unitId') unitId: string,
  ) {
    return this.service.getUnitPendingFees(tenantId, unitId)
  }

  @Get('units/:unitId/statement')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Estado de cuenta de una unidad' })
  getStatement (
    @TenantId() tenantId: string,
    @Param('unitId') unitId: string,
    @Query() query: AccountStatementQueryDto,
  ) {
    return this.service.getAccountStatement(tenantId, unitId, query)
  }

  @Get('units/:unitId/statement/pdf')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Generar PDF del estado de cuenta' })
  async getStatementPdf (
    @TenantId() tenantId: string,
    @Param('unitId') unitId: string,
    @Query() query: AccountStatementQueryDto,
  ) {
    return this.service.generateStatementPdf(tenantId, unitId, query)
  }

  @Get('condominiums/:condominiumId/account-summaries')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Resumen de estado de cuenta por unidades con propietario' })
  getAccountSummaries (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.getOwnedUnitAccountSummaries(tenantId, condominiumId, query)
  }

  @Get('condominiums/:condominiumId/morosity')
  @RequirePermissions('finance:read')
  getMorosity (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
  ) {
    return this.service.getMorosityReport(tenantId, condominiumId)
  }
}

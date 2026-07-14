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
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { ExpensesService } from './expenses.service'
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto'

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor (private readonly service: ExpensesService) {}

  @Get()
  @RequirePermissions('finance:read')
  findAll (
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
    @Query('condominiumId') condominiumId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(tenantId, query, condominiumId, from, to)
  }

  @Get('summary')
  @RequirePermissions('finance:read')
  summary (
    @TenantId() tenantId: string,
    @Query('condominiumId') condominiumId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.summary(tenantId, condominiumId, from, to)
  }

  @Get(':id')
  @RequirePermissions('finance:read')
  findOne (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id)
  }

  @Post()
  @RequirePermissions('finance:create')
  create (@TenantId() tenantId: string, @Body() dto: CreateExpenseDto) {
    return this.service.create(tenantId, dto)
  }

  @Patch(':id')
  @RequirePermissions('finance:update')
  update (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.service.update(tenantId, id, dto)
  }

  @Delete(':id')
  @RequirePermissions('finance:delete')
  remove (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id)
  }
}

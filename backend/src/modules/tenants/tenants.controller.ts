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

import { RequirePermissions } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto'
import { TenantsService } from './tenants.service'

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor (private readonly service: TenantsService) {}

  @Get()
  @RequirePermissions('tenants:read')
  @ApiOperation({ summary: 'Listar empresas administradoras' })
  findAll (@Query() query: PaginationQueryDto) {
    return this.service.findAll(query)
  }

  @Get(':id')
  @RequirePermissions('tenants:read')
  findOne (@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post()
  @RequirePermissions('tenants:create')
  create (@Body() dto: CreateTenantDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  @RequirePermissions('tenants:update')
  update (@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions('tenants:delete')
  remove (@Param('id') id: string) {
    return this.service.remove(id)
  }
}

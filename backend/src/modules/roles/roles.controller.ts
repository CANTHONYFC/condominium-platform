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
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { CreateRoleDto, UpdateRoleDto } from '../users/dto/user.dto'
import { UpdateMenuAccessDto } from './dto/menu-access.dto'
import { RolesService } from './roles.service'

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor (private readonly service: RolesService) {}

  @Get('menu-catalog')
  @RequirePermissions('roles:read')
  menuCatalog () {
    return this.service.getMenuCatalog()
  }

  @Get()
  @RequirePermissions('roles:read')
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }

  @Get(':id')
  @RequirePermissions('roles:read')
  findOne (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id)
  }

  @Post()
  @RequirePermissions('roles:create')
  @ApiOperation({ summary: 'Crear rol personalizado' })
  create (@TenantId() tenantId: string, @Body() dto: CreateRoleDto) {
    return this.service.create(tenantId, dto)
  }

  @Patch(':id/menu-access')
  @RequirePermissions('roles:update')
  @ApiOperation({ summary: 'Actualizar menús visibles del rol' })
  updateMenuAccess (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMenuAccessDto,
  ) {
    return this.service.updateMenuAccess(tenantId, id, dto.menuKeys)
  }

  @Post(':id/menu-access/reset')
  @RequirePermissions('roles:update')
  @ApiOperation({ summary: 'Restaurar menús por defecto del rol' })
  resetMenuAccess (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.resetMenuAccess(tenantId, id)
  }

  @Patch(':id')
  @RequirePermissions('roles:update')
  update (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.service.update(tenantId, id, dto)
  }

  @Delete(':id')
  @RequirePermissions('roles:update')
  remove (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id)
  }
}

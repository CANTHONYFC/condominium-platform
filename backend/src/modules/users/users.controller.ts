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
import { UsersService } from './users.service'
import { CreateUserDto, UpdateUserDto } from './dto/user.dto'
import { UserStatus } from '../../../generated/prisma'

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor (private readonly service: UsersService) {}

  @Get()
  @RequirePermissions('users:read')
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }

  @Get(':id')
  @RequirePermissions('users:read')
  findOne (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id)
  }

  @Post()
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Crear usuario en la empresa' })
  create (@TenantId() tenantId: string, @Body() dto: CreateUserDto) {
    return this.service.create(tenantId, dto)
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  update (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.update(tenantId, id, dto)
  }

  @Patch(':id/status/:status')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Activar o inactivar usuario' })
  setStatus (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('status') status: UserStatus,
  ) {
    return this.service.setStatus(tenantId, id, status)
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  remove (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id)
  }
}

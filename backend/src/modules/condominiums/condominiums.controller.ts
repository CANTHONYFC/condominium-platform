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

import {
  CurrentUser,
  RequirePermissions,
  TenantId,
  type AuthenticatedUser,
} from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { CondominiumsService } from './condominiums.service'
import { CreateCondominiumDto, UpdateCondominiumDto } from './dto/condominium.dto'

@ApiTags('Condominiums')
@ApiBearerAuth()
@Controller('condominiums')
export class CondominiumsController {
  constructor (private readonly service: CondominiumsService) {}

  @Get()
  @RequirePermissions('condominiums:read')
  @ApiOperation({ summary: 'Listar condominios del tenant' })
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }

  @Get(':id')
  @RequirePermissions('condominiums:read')
  findOne (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id)
  }

  @Post()
  @RequirePermissions('condominiums:create')
  create (
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCondominiumDto,
  ) {
    return this.service.create(tenantId, dto, user.sub)
  }

  @Patch(':id')
  @RequirePermissions('condominiums:update')
  update (
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCondominiumDto,
  ) {
    return this.service.update(tenantId, id, dto, user.sub)
  }

  @Delete(':id')
  @RequirePermissions('condominiums:delete')
  remove (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id)
  }
}

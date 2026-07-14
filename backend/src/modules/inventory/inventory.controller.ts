import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { InventoryService } from './inventory.service'

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor (private readonly service: InventoryService) {}

  @Get()
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Listar inventory' })
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }
}

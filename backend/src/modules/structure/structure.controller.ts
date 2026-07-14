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
import { StructureService } from './structure.service'
import {
  CreateBlockDto,
  CreateFloorDto,
  CreateTowerDto,
  CreateUnitDto,
  GenerateStructureDto,
  GenerateDepartmentUnitsDto,
  UpdateBlockDto,
  UpdateFloorDto,
  UpdateTowerDto,
  UpdateUnitDto,
} from './dto/structure.dto'

@ApiTags('Structure')
@ApiBearerAuth()
@Controller('condominiums/:condominiumId')
export class StructureController {
  constructor (private readonly service: StructureService) {}

  @Get('structure')
  @RequirePermissions('units:read')
  @ApiOperation({ summary: 'Árbol de estructura del condominio' })
  getTree (@TenantId() tenantId: string, @Param('condominiumId') condominiumId: string) {
    return this.service.getStructureTree(tenantId, condominiumId)
  }

  @Get('structure/mode')
  @RequirePermissions('units:read')
  @ApiOperation({ summary: 'Modo de estructura según tipo de empresa' })
  getStructureMode (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
  ) {
    return this.service.getStructureMode(tenantId, condominiumId)
  }

  @Post('structure/generate')
  @RequirePermissions('units:create')
  @ApiOperation({ summary: 'Generar estructura automática (edificio o condominio)' })
  generateStructure (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Body() dto: GenerateStructureDto,
  ) {
    return this.service.generateStructure(tenantId, condominiumId, dto)
  }

  @Post('structure/generate-units')
  @RequirePermissions('units:create')
  @ApiOperation({ summary: 'Generar departamentos D-001… en pisos existentes' })
  generateDepartmentUnits (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Body() dto: GenerateDepartmentUnitsDto,
  ) {
    return this.service.generateDepartmentUnits(tenantId, condominiumId, dto)
  }

  // Towers
  @Get('towers')
  @RequirePermissions('units:read')
  findTowers (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.findTowers(tenantId, condominiumId, query)
  }

  @Post('towers')
  @RequirePermissions('units:create')
  createTower (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Body() dto: CreateTowerDto,
  ) {
    return this.service.createTower(tenantId, condominiumId, dto)
  }

  @Patch('towers/:id')
  @RequirePermissions('units:update')
  updateTower (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTowerDto,
  ) {
    return this.service.updateTower(tenantId, condominiumId, id, dto)
  }

  @Delete('towers/:id')
  @RequirePermissions('units:delete')
  removeTower (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeTower(tenantId, condominiumId, id)
  }

  // Blocks
  @Get('blocks')
  @RequirePermissions('units:read')
  findBlocks (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.findBlocks(tenantId, condominiumId, query)
  }

  @Post('blocks')
  @RequirePermissions('units:create')
  createBlock (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Body() dto: CreateBlockDto,
  ) {
    return this.service.createBlock(tenantId, condominiumId, dto)
  }

  @Patch('blocks/:id')
  @RequirePermissions('units:update')
  updateBlock (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBlockDto,
  ) {
    return this.service.updateBlock(tenantId, condominiumId, id, dto)
  }

  @Delete('blocks/:id')
  @RequirePermissions('units:delete')
  removeBlock (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeBlock(tenantId, condominiumId, id)
  }

  // Floors
  @Get('floors')
  @RequirePermissions('units:read')
  findFloors (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.findFloors(tenantId, condominiumId, query)
  }

  @Post('floors')
  @RequirePermissions('units:create')
  createFloor (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Body() dto: CreateFloorDto,
  ) {
    return this.service.createFloor(tenantId, condominiumId, dto)
  }

  @Patch('floors/:id')
  @RequirePermissions('units:update')
  updateFloor (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFloorDto,
  ) {
    return this.service.updateFloor(tenantId, condominiumId, id, dto)
  }

  @Delete('floors/:id')
  @RequirePermissions('units:delete')
  removeFloor (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeFloor(tenantId, condominiumId, id)
  }

  // Units
  @Get('units/available')
  @RequirePermissions('units:read')
  @ApiOperation({ summary: 'Departamentos o domicilios disponibles para asignar' })
  findAvailableUnits (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
  ) {
    return this.service.findAvailableUnits(tenantId, condominiumId)
  }

  @Get('units')
  @RequirePermissions('units:read')
  findUnits (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.findUnits(tenantId, condominiumId, query)
  }

  @Get('units/:id')
  @RequirePermissions('units:read')
  findUnit (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Param('id') id: string,
  ) {
    return this.service.findUnit(tenantId, condominiumId, id)
  }

  @Post('units')
  @RequirePermissions('units:create')
  createUnit (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Body() dto: CreateUnitDto,
  ) {
    return this.service.createUnit(tenantId, condominiumId, dto)
  }

  @Patch('units/:id')
  @RequirePermissions('units:update')
  updateUnit (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.service.updateUnit(tenantId, condominiumId, id, dto)
  }

  @Delete('units/:id')
  @RequirePermissions('units:delete')
  removeUnit (
    @TenantId() tenantId: string,
    @Param('condominiumId') condominiumId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeUnit(tenantId, condominiumId, id)
  }
}

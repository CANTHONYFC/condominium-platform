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
import { ResidentsService } from './residents.service'
import {
  CreatePetDto,
  CreateResidentDocumentDto,
  CreateResidentDto,
  CreateResidentHistoryDto,
  UpdateResidentDto,
} from './dto/resident.dto'

@ApiTags('Residents')
@ApiBearerAuth()
@Controller('residents')
export class ResidentsController {
  constructor (private readonly service: ResidentsService) {}

  @Get()
  @RequirePermissions('residents:read')
  findAll (
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
    @Query('unitId') unitId?: string,
  ) {
    return this.service.findAll(tenantId, query, unitId)
  }

  @Get(':id')
  @RequirePermissions('residents:read')
  findOne (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id)
  }

  @Post()
  @RequirePermissions('residents:create')
  create (@TenantId() tenantId: string, @Body() dto: CreateResidentDto) {
    return this.service.create(tenantId, dto)
  }

  @Patch(':id')
  @RequirePermissions('residents:update')
  update (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateResidentDto,
  ) {
    return this.service.update(tenantId, id, dto)
  }

  @Delete(':id')
  @RequirePermissions('residents:delete')
  remove (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id)
  }

  @Get(':id/history')
  @RequirePermissions('residents:read')
  getHistory (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.getHistory(tenantId, id, query)
  }

  @Post(':id/history')
  @RequirePermissions('residents:update')
  addHistory (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateResidentHistoryDto,
  ) {
    return this.service.addHistoryEntry(tenantId, id, dto)
  }

  @Get(':id/documents')
  @RequirePermissions('residents:read')
  listDocuments (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.listDocuments(tenantId, id)
  }

  @Post(':id/documents')
  @RequirePermissions('residents:update')
  addDocument (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateResidentDocumentDto,
  ) {
    return this.service.addDocument(tenantId, id, dto)
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions('residents:update')
  removeDocument (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.service.removeDocument(tenantId, id, documentId)
  }

  @Post(':id/pets')
  @RequirePermissions('residents:update')
  addPet (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreatePetDto,
  ) {
    return this.service.addPet(tenantId, id, dto)
  }
}

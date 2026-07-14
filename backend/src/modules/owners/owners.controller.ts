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
import { OwnersService } from './owners.service'
import {
  AssignOwnershipDto,
  CreateOwnerDocumentDto,
  CreateOwnerDto,
  CreateOwnerHistoryDto,
  UpdateOwnerDto,
} from './dto/owner.dto'

@ApiTags('Owners')
@ApiBearerAuth()
@Controller('owners')
export class OwnersController {
  constructor (private readonly service: OwnersService) {}

  @Get()
  @RequirePermissions('owners:read')
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }

  @Get(':id')
  @RequirePermissions('owners:read')
  findOne (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id)
  }

  @Post()
  @RequirePermissions('owners:create')
  create (@TenantId() tenantId: string, @Body() dto: CreateOwnerDto) {
    return this.service.create(tenantId, dto)
  }

  @Patch(':id')
  @RequirePermissions('owners:update')
  update (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOwnerDto,
  ) {
    return this.service.update(tenantId, id, dto)
  }

  @Delete(':id')
  @RequirePermissions('owners:delete')
  remove (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id)
  }

  @Post(':id/ownerships')
  @RequirePermissions('owners:update')
  assignOwnership (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignOwnershipDto,
  ) {
    return this.service.assignOwnership(tenantId, id, dto)
  }

  @Delete(':id/ownerships/:ownershipId')
  @RequirePermissions('owners:update')
  removeOwnership (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('ownershipId') ownershipId: string,
  ) {
    return this.service.removeOwnership(tenantId, id, ownershipId)
  }

  @Get(':id/history')
  @RequirePermissions('owners:read')
  getHistory (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.getHistory(tenantId, id, query)
  }

  @Post(':id/history')
  @RequirePermissions('owners:update')
  addHistory (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateOwnerHistoryDto,
  ) {
    return this.service.addHistoryEntry(tenantId, id, dto)
  }

  @Get(':id/documents')
  @RequirePermissions('owners:read')
  listDocuments (@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.listDocuments(tenantId, id)
  }

  @Post(':id/documents')
  @RequirePermissions('owners:update')
  addDocument (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateOwnerDocumentDto,
  ) {
    return this.service.addDocument(tenantId, id, dto)
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions('owners:update')
  removeDocument (
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.service.removeDocument(tenantId, id, documentId)
  }
}

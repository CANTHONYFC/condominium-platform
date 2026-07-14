const fs = require('fs')
const path = require('path')

const modules = [
  ['owners', 'Owners', 'owners'],
  ['residents', 'Residents', 'residents'],
  ['units', 'Units', 'units'],
  ['staff', 'Staff', 'staff'],
  ['users', 'Users', 'users'],
  ['finance', 'Finance', 'finance'],
  ['billing', 'Billing', 'billing'],
  ['communications', 'Communications', 'communications'],
  ['helpdesk', 'Helpdesk', 'helpdesk'],
  ['incidents', 'Incidents', 'incidents'],
  ['reservations', 'Reservations', 'reservations'],
  ['visits', 'Visits', 'visits'],
  ['vehicles', 'Vehicles', 'vehicles'],
  ['correspondence', 'Correspondence', 'correspondence'],
  ['inventory', 'Inventory', 'inventory'],
  ['purchases', 'Purchases', 'purchases'],
  ['contracts', 'Contracts', 'contracts'],
  ['documents', 'Documents', 'documents'],
  ['surveys', 'Surveys', 'surveys'],
  ['calendar', 'Calendar', 'calendar'],
  ['reports', 'Reports', 'reports'],
  ['settings', 'Settings', 'settings'],
]

for (const [folder, Name, perm] of modules) {
  const base = path.join(__dirname, '..', 'src/modules', folder)
  fs.mkdirSync(base, { recursive: true })

  fs.writeFileSync(
    path.join(base, `${folder}.service.ts`),
    `import { Injectable } from '@nestjs/common'

import { PrismaService } from '../../infrastructure/database/prisma.service'
import { PaginationQueryDto, buildPaginatedResult, getPaginationParams } from '../../common/dto/pagination.dto'

@Injectable()
export class ${Name}Service {
  constructor (private readonly prisma: PrismaService) {}

  async findAll (tenantId: string, query: PaginationQueryDto) {
    const { page, limit } = getPaginationParams(query)
    return buildPaginatedResult([], 0, page, limit)
  }
}
`,
  )

  fs.writeFileSync(
    path.join(base, `${folder}.controller.ts`),
    `import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions, TenantId } from '../../common/decorators/auth.decorator'
import { PaginationQueryDto } from '../../common/dto/pagination.dto'
import { ${Name}Service } from './${folder}.service'

@ApiTags('${Name}')
@ApiBearerAuth()
@Controller('${folder}')
export class ${Name}Controller {
  constructor (private readonly service: ${Name}Service) {}

  @Get()
  @RequirePermissions('${perm}:read')
  @ApiOperation({ summary: 'Listar ${folder}' })
  findAll (@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query)
  }
}
`,
  )

  fs.writeFileSync(
    path.join(base, `${folder}.module.ts`),
    `import { Module } from '@nestjs/common'

import { ${Name}Controller } from './${folder}.controller'
import { ${Name}Service } from './${folder}.service'

@Module({
  controllers: [${Name}Controller],
  providers: [${Name}Service],
  exports: [${Name}Service],
})
export class ${Name}Module {}
`,
  )
}

console.log('Generated', modules.length, 'modules')

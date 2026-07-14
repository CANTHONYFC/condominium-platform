import { Global, Module } from '@nestjs/common'

import { TenantScopeService } from './services/tenant-scope.service'
import { TenantBootstrapService } from './services/tenant-bootstrap.service'
import { PortalContextService } from './services/portal-context.service'

@Global()
@Module({
  providers: [TenantScopeService, TenantBootstrapService, PortalContextService],
  exports: [TenantScopeService, TenantBootstrapService, PortalContextService],
})
export class CommonModule {}

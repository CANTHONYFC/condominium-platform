import { Module } from '@nestjs/common'

import { FinanceModule } from '../finance/finance.module'
import { ReservationsModule } from '../reservations/reservations.module'
import { CommonAreasModule } from '../common-areas/common-areas.module'
import { PortalController } from './portal.controller'
import { PortalService } from './portal.service'

@Module({
  imports: [FinanceModule, ReservationsModule, CommonAreasModule],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}

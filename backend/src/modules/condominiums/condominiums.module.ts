import { Module } from '@nestjs/common'

import { CondominiumsController } from './condominiums.controller'
import { CondominiumsRepository, CondominiumsService } from './condominiums.service'

@Module({
  controllers: [CondominiumsController],
  providers: [CondominiumsService, CondominiumsRepository],
  exports: [CondominiumsService],
})
export class CondominiumsModule {}

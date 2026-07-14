import { Module } from '@nestjs/common'

import { ResidentsController } from './residents.controller'
import { ResidentsRepository, ResidentsService } from './residents.service'

@Module({
  controllers: [ResidentsController],
  providers: [ResidentsService, ResidentsRepository],
  exports: [ResidentsService],
})
export class ResidentsModule {}

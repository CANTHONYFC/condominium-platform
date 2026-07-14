import { Module } from '@nestjs/common'

import { CommonAreasController } from './common-areas.controller'
import { CommonAreasService } from './common-areas.service'

@Module({
  controllers: [CommonAreasController],
  providers: [CommonAreasService],
  exports: [CommonAreasService],
})
export class CommonAreasModule {}

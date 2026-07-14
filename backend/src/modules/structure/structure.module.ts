import { Module } from '@nestjs/common'

import { StructureController } from './structure.controller'
import { StructureRepository, StructureService } from './structure.service'

@Module({
  controllers: [StructureController],
  providers: [StructureService, StructureRepository],
  exports: [StructureService],
})
export class StructureModule {}

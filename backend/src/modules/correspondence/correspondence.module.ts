import { Module } from '@nestjs/common'

import { CorrespondenceController } from './correspondence.controller'
import { CorrespondenceService } from './correspondence.service'

@Module({
  controllers: [CorrespondenceController],
  providers: [CorrespondenceService],
  exports: [CorrespondenceService],
})
export class CorrespondenceModule {}

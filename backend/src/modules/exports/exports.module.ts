import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'

import { ExportsController } from './exports.controller'
import { ExportsService } from './exports.service'
import { ExportGeneratorService } from './export-generator.service'
import { EXPORT_QUEUE, ExportProcessor } from './export.processor'

@Module({
  imports: [
    BullModule.registerQueue({ name: EXPORT_QUEUE }),
  ],
  controllers: [ExportsController],
  providers: [ExportsService, ExportGeneratorService, ExportProcessor],
  exports: [ExportsService],
})
export class ExportsModule {}

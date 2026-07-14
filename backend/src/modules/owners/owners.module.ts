import { Module } from '@nestjs/common'

import { OwnersController } from './owners.controller'
import { OwnersRepository, OwnersService } from './owners.service'

@Module({
  controllers: [OwnersController],
  providers: [OwnersService, OwnersRepository],
  exports: [OwnersService],
})
export class OwnersModule {}

import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'

import { RequirePermissions } from '../../common/decorators/auth.decorator'
import { StorageService } from './storage.service'

@ApiTags('Storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor (private readonly storage: StorageService) {}

  @Post('upload')
  @RequirePermissions('documents:create')
  @ApiOperation({ summary: 'Subir archivo (almacenamiento local)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'maintenance' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  upload (
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    return this.storage.saveFile(file, folder ?? 'files')
  }
}

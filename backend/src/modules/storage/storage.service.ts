import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

@Injectable()
export class StorageService {
  constructor (private readonly config: ConfigService) {}

  getStoragePath () {
    return this.config.get<string>('upload.storagePath') ?? './uploads'
  }

  getMaxSize () {
    return this.config.get<number>('upload.maxSize') ?? 10485760
  }

  /**
   * Saves a file locally under uploads/{folder}/.
   * Returns a public URL path served by Express static (/uploads/...).
   * Replace this service later for S3 or other object storage.
   */
  saveFile (
    file: Express.Multer.File,
    folder = 'files',
  ): { fileUrl: string; fileSize: number; mimeType: string; filename: string } {
    if (!file) throw new BadRequestException('File is required')
    if (file.size > this.getMaxSize()) {
      throw new BadRequestException(`File exceeds max size of ${this.getMaxSize()} bytes`)
    }

    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '')
    const ext = path.extname(file.originalname).toLowerCase()
    const filename = `${randomUUID()}${ext}`
    const dir = path.join(process.cwd(), this.getStoragePath(), safeFolder)
    fs.mkdirSync(dir, { recursive: true })

    const target = path.join(dir, filename)
    fs.writeFileSync(target, file.buffer)

    return {
      fileUrl: `/uploads/${safeFolder}/${filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
      filename: file.originalname,
    }
  }
}

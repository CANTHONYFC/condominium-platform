import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { UploadResult } from '../models/domain.models'

@Injectable({ providedIn: 'root' })
export class StorageApiService {
  private readonly api = inject(ApiService)

  upload (file: File, folder = 'files') {
    return this.api.upload<UploadResult>('/storage/upload', file, folder)
  }
}

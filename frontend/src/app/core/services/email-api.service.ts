import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { EmailJob, Paginated } from '../models/domain.models'

@Injectable({ providedIn: 'root' })
export class EmailApiService {
  private readonly api = inject(ApiService)

  sendStatements (condominiumId: string, onlyMorosity = true) {
    return this.api.post<{ queued: number }>(`/email/condominiums/${condominiumId}/send-statements`, { onlyMorosity })
  }

  listJobs (params?: Record<string, string | number>) {
    return this.api.get<Paginated<EmailJob>>('/email/jobs', params)
  }

  smtpStatus () {
    return this.api.get<{ configured: boolean; morosityCron?: { enabled: boolean; schedule: string; description: string } }>('/email/status')
  }

  runMorosityCronNow () {
    return this.api.post<{ ok: boolean }>('/email/cron/morosity/run-now', {})
  }
}

import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { DashboardOverview } from '../models/domain.models'

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly api = inject(ApiService)

  getOverview (condominiumId?: string) {
    return this.api.get<DashboardOverview>('/dashboard/kpis', {
      condominiumId: condominiumId ?? '',
    })
  }
}

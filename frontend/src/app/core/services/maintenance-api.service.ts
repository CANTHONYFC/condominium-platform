import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { MaintenanceEvent, Paginated } from '../models/domain.models'

@Injectable({ providedIn: 'root' })
export class MaintenanceApiService {
  private readonly api = inject(ApiService)

  list (params?: Record<string, string | number>) {
    return this.api.get<Paginated<MaintenanceEvent>>('/calendar/events', params)
  }

  summary (condominiumId: string, from?: string, to?: string) {
    return this.api.get<{ total: number; totalCost: number; completed: number }>(
      '/calendar/maintenance/summary',
      { condominiumId, from: from ?? '', to: to ?? '' },
    )
  }

  create (body: {
    condominiumId: string
    title: string
    description?: string
    startAt: string
    endAt: string
    vendor?: string
    cost?: number
    attachmentUrl?: string
    status?: string
    commonAreaId?: string | null
  }) {
    return this.api.post<MaintenanceEvent>('/calendar/events', { ...body, type: 'MAINTENANCE' })
  }

  update (id: string, body: Partial<MaintenanceEvent & { cost: number }>) {
    return this.api.patch<MaintenanceEvent>(`/calendar/events/${id}`, body)
  }

  remove (id: string) {
    return this.api.delete(`/calendar/events/${id}`)
  }
}

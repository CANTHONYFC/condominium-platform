import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type {
  AvailabilitySlot,
  CommonArea,
  CommonAreaBlock,
  CommonAreaSchedule,
  Paginated,
  Reservation,
} from '../models/domain.models'

@Injectable({ providedIn: 'root' })
export class ReservationsApiService {
  private readonly api = inject(ApiService)

  listAreas (condominiumId: string) {
    return this.api.get<CommonArea[]>(`/condominiums/${condominiumId}/common-areas`)
  }

  createArea (condominiumId: string, body: { name: string; description?: string; capacity?: number; maxReservationHours?: number }) {
    return this.api.post<CommonArea>(`/condominiums/${condominiumId}/common-areas`, body)
  }

  updateArea (id: string, body: Partial<CommonArea>) {
    return this.api.patch<CommonArea>(`/common-areas/${id}`, body)
  }

  removeArea (id: string) {
    return this.api.delete(`/common-areas/${id}`)
  }

  saveSchedule (areaId: string, body: { dayOfWeek: number; startTime: string; endTime: string; slotMinutes?: number }) {
    return this.api.put<CommonAreaSchedule>(`/common-areas/${areaId}/schedules`, body)
  }

  removeSchedule (areaId: string, dayOfWeek: number) {
    return this.api.delete(`/common-areas/${areaId}/schedules/${dayOfWeek}`)
  }

  listBlocks (areaId: string) {
    return this.api.get<CommonAreaBlock[]>(`/common-areas/${areaId}/blocks`)
  }

  createBlock (areaId: string, body: { startAt: string; endAt: string; reason?: string }) {
    return this.api.post<CommonAreaBlock>(`/common-areas/${areaId}/blocks`, body)
  }

  removeBlock (areaId: string, blockId: string) {
    return this.api.delete(`/common-areas/${areaId}/blocks/${blockId}`)
  }

  listReservations (params?: Record<string, string | number>) {
    return this.api.get<Paginated<Reservation>>('/reservations', params)
  }

  getAvailability (commonAreaId: string, date: string) {
    return this.api.get<{
      date: string
      maxReservationHours?: number
      schedule?: { startTime: string; endTime: string; slotMinutes: number }
      slots: AvailabilitySlot[]
      message?: string
    }>(
      `/reservations/common-areas/${commonAreaId}/availability`,
      { date },
    )
  }

  createReservation (body: {
    condominiumId: string
    commonAreaId: string
    unitId?: string
    startAt: string
    endAt: string
    notes?: string
  }) {
    return this.api.post<Reservation>('/reservations', body)
  }

  cancelReservation (id: string) {
    return this.api.delete(`/reservations/${id}`)
  }
}

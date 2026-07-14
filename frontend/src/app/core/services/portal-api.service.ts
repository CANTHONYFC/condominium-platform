import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { AccountStatement, Paginated, Reservation } from '../models/domain.models'

export interface PortalContext {
  residentId: string
  residentType: string
  unitId: string
  unitCode: string
  condominiumId: string
  condominiumName: string
  condominiumCode: string
  ownerId?: string | null
}

export interface PortalHome {
  residentId: string
  residentType: string
  unitId: string
  unitCode: string
  condominiumId: string
  condominiumName: string
  condominiumCode: string
  ownerId: string | null
  pendingBalance: number
  pendingDebtsCount: number
  pendingDebts: AccountStatement['pendingDebts']
  hasPendingDebt: boolean
  upcomingReservations: Reservation[]
  summary: AccountStatement['summary']
}

@Injectable({ providedIn: 'root' })
export class PortalApiService {
  private readonly api = inject(ApiService)

  getHome () {
    return this.api.get<PortalHome>('/portal/home')
  }

  getContext () {
    return this.api.get<PortalContext>('/portal/context')
  }

  listMyCommonAreas () {
    return this.api.get<{ context: PortalContext; areas: import('../models/domain.models').CommonArea[] }>(
      '/portal/common-areas',
    )
  }

  listMyReservations (params?: Record<string, string | number>) {
    return this.api.get<Paginated<Reservation> & { context: PortalContext }>('/portal/reservations', params)
  }

  createMyReservation (body: {
    condominiumId: string
    commonAreaId: string
    startAt: string
    endAt: string
    notes?: string
  }) {
    return this.api.post<Reservation>('/portal/reservations', body)
  }

  getMyStatement (fromPeriod?: string, toPeriod?: string) {
    return this.api.get<AccountStatement & { context: PortalContext }>('/portal/statement', {
      fromPeriod: fromPeriod ?? '',
      toPeriod: toPeriod ?? '',
    })
  }
}

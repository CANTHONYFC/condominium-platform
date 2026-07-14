import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { EntityDocument, Owner, OwnerHistory, Paginated, UnitOwnership } from '../models/domain.models'

@Injectable({ providedIn: 'root' })
export class OwnersApiService {
  private readonly api = inject(ApiService)

  list (params?: Record<string, string | number>) {
    return this.api.get<Paginated<Owner>>('/owners', params)
  }

  get (id: string) {
    return this.api.get<Owner>(`/owners/${id}`)
  }

  create (body: Record<string, unknown>) {
    return this.api.post<Owner>('/owners', body)
  }

  update (id: string, body: Record<string, unknown>) {
    return this.api.patch<Owner>(`/owners/${id}`, body)
  }

  remove (id: string) {
    return this.api.delete(`/owners/${id}`)
  }

  assignOwnership (ownerId: string, body: { unitId: string; sharePercent?: number; isPrimary?: boolean }) {
    return this.api.post<UnitOwnership>(`/owners/${ownerId}/ownerships`, body)
  }

  removeOwnership (ownerId: string, ownershipId: string) {
    return this.api.delete(`/owners/${ownerId}/ownerships/${ownershipId}`)
  }

  listHistory (ownerId: string) {
    return this.api.get<Paginated<OwnerHistory>>(`/owners/${ownerId}/history`, { limit: 50 })
  }

  addHistory (ownerId: string, body: { event: string; notes?: string }) {
    return this.api.post(`/owners/${ownerId}/history`, body)
  }

  listDocuments (ownerId: string) {
    return this.api.get<EntityDocument[]>(`/owners/${ownerId}/documents`)
  }

  addDocument (ownerId: string, body: { category: string; title: string; fileUrl: string }) {
    return this.api.post<EntityDocument>(`/owners/${ownerId}/documents`, body)
  }

  removeDocument (ownerId: string, documentId: string) {
    return this.api.delete(`/owners/${ownerId}/documents/${documentId}`)
  }
}

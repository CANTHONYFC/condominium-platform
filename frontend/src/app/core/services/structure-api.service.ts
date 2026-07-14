import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { Floor, Paginated, Tower, Unit } from '../models/domain.models'

@Injectable({ providedIn: 'root' })
export class StructureApiService {
  private readonly api = inject(ApiService)

  private base (condoId: string) {
    return `/condominiums/${condoId}`
  }

  getTree (condoId: string) {
    return this.api.get<{ towers: Tower[]; blocks: unknown[]; totalFloors: number; unitsByType: unknown[] }>(
      `${this.base(condoId)}/structure`,
    )
  }

  listTowers (condoId: string) {
    return this.api.get<Paginated<Tower>>(`${this.base(condoId)}/towers`, { limit: 100 })
  }

  createTower (condoId: string, body: { code: string; name: string; floorsCount?: number }) {
    return this.api.post<Tower>(`${this.base(condoId)}/towers`, body)
  }

  updateTower (condoId: string, id: string, body: Partial<Tower>) {
    return this.api.patch<Tower>(`${this.base(condoId)}/towers/${id}`, body)
  }

  deleteTower (condoId: string, id: string) {
    return this.api.delete(`${this.base(condoId)}/towers/${id}`)
  }

  listFloors (condoId: string) {
    return this.api.get<Paginated<Floor>>(`${this.base(condoId)}/floors`, { limit: 100 })
  }

  createFloor (condoId: string, body: { number: number; name?: string; towerId?: string; blockId?: string }) {
    return this.api.post<Floor>(`${this.base(condoId)}/floors`, body)
  }

  updateFloor (condoId: string, id: string, body: Partial<Floor>) {
    return this.api.patch<Floor>(`${this.base(condoId)}/floors/${id}`, body)
  }

  deleteFloor (condoId: string, id: string) {
    return this.api.delete(`${this.base(condoId)}/floors/${id}`)
  }

  listAvailableUnits (condoId: string) {
    return this.api.get<Unit[]>(`${this.base(condoId)}/units/available`)
  }

  listUnits (condoId: string, search?: string) {
    return this.api.get<Paginated<Unit>>(`${this.base(condoId)}/units`, { limit: 100, search: search ?? '' })
  }

  getUnit (condoId: string, id: string) {
    return this.api.get<Unit>(`${this.base(condoId)}/units/${id}`)
  }

  createUnit (condoId: string, body: Record<string, unknown>) {
    return this.api.post<Unit>(`${this.base(condoId)}/units`, body)
  }

  updateUnit (condoId: string, id: string, body: Record<string, unknown>) {
    return this.api.patch<Unit>(`${this.base(condoId)}/units/${id}`, body)
  }

  deleteUnit (condoId: string, id: string) {
    return this.api.delete(`${this.base(condoId)}/units/${id}`)
  }

  getStructureMode (condoId: string) {
    return this.api.get<{
      mode: 'BUILDING' | 'CONDOMINIUM'
      organizationType: string
      propertyType: string
      unitCodePrefix: string
    }>(`${this.base(condoId)}/structure/mode`)
  }

  generateStructure (condoId: string, body: Record<string, unknown>) {
    return this.api.post<{
      mode: 'BUILDING' | 'CONDOMINIUM'
      towersCreated: number
      floorsCreated: number
      unitsCreated: number
    }>(`${this.base(condoId)}/structure/generate`, body)
  }

  generateDepartmentUnits (condoId: string, body: {
    unitsPerFloor: number
    replaceExisting?: boolean
    unitCodePrefix?: string
  }) {
    return this.api.post<{
      floorsProcessed: number
      unitsCreated: number
      firstCode: string
      lastCode: string
    }>(`${this.base(condoId)}/structure/generate-units`, body)
  }
}

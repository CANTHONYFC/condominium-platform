import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { Condominium, Paginated } from '../models/domain.models'

@Injectable({ providedIn: 'root' })
export class CondominiumsApiService {
  private readonly api = inject(ApiService)

  list (params?: Record<string, string | number>) {
    return this.api.get<Paginated<Condominium>>('/condominiums', params)
  }

  get (id: string) {
    return this.api.get<Condominium>(`/condominiums/${id}`)
  }

  create (body: Partial<Condominium>) {
    return this.api.post<Condominium>('/condominiums', body)
  }

  update (id: string, body: Partial<Condominium>) {
    return this.api.patch<Condominium>(`/condominiums/${id}`, body)
  }

  remove (id: string) {
    return this.api.delete(`/condominiums/${id}`)
  }
}

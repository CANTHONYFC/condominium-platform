import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { Paginated } from '../models/domain.models'

export interface Tenant {
  id: string
  code: string
  name: string
  legalName?: string
  email: string
  phone?: string
  organizationType: 'MANAGEMENT_FIRM' | 'CONDOMINIUM' | 'BUILDING'
  maxUsers: number
  isActive: boolean
  usersCount?: number
  condominiumsCount?: number
}

export interface CreateTenantAdminPayload {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
}

export interface CreateTenantPayload {
  name: string
  email: string
  organizationType: Tenant['organizationType']
  maxUsers: number
  admin: CreateTenantAdminPayload
  legalName?: string
  taxId?: string
  phone?: string
  address?: string
}

@Injectable({ providedIn: 'root' })
export class TenantsApiService {
  private readonly api = inject(ApiService)

  list (params?: Record<string, string | number>) {
    return this.api.get<Paginated<Tenant>>('/tenants', params)
  }

  create (body: CreateTenantPayload) {
    return this.api.post<Tenant>('/tenants', body)
  }

  update (id: string, body: Partial<Tenant>) {
    return this.api.patch<Tenant>(`/tenants/${id}`, body)
  }

  remove (id: string) {
    return this.api.delete(`/tenants/${id}`)
  }
}

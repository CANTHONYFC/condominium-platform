import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'
import type { Paginated } from '../models/domain.models'

export interface AppUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  status: string
  lastLoginAt?: string
  roles?: Array<{ id: string; code: string; name: string; isSystem: boolean }>
}

export interface AppRole {
  id: string
  code: string
  name: string
  description?: string
  isSystem: boolean
  usersCount?: number
  permissions?: string[]
  menuAccess?: string[]
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly api = inject(ApiService)

  list (params?: Record<string, string | number>) {
    return this.api.get<Paginated<AppUser>>('/users', params)
  }

  create (body: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
    roleCode: string
  }) {
    return this.api.post<AppUser>('/users', body)
  }

  update (id: string, body: Record<string, unknown>) {
    return this.api.patch<AppUser>(`/users/${id}`, body)
  }

  setStatus (id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
    return this.api.patch(`/users/${id}/status/${status}`, {})
  }

  remove (id: string) {
    return this.api.delete(`/users/${id}`)
  }
}

@Injectable({ providedIn: 'root' })
export class RolesApiService {
  private readonly api = inject(ApiService)

  list (params?: Record<string, string | number>) {
    return this.api.get<Paginated<AppRole>>('/roles', params)
  }

  create (body: { code: string; name: string; description?: string; permissionCodes: string[] }) {
    return this.api.post<AppRole>('/roles', body)
  }

  menuCatalog () {
    return this.api.get<Array<{ key: string; path: string; label: string; section: string }>>('/roles/menu-catalog')
  }

  updateMenuAccess (id: string, menuKeys: string[]) {
    return this.api.patch<{ id: string; code: string; name: string; menuAccess: string[] }>(
      `/roles/${id}/menu-access`,
      { menuKeys },
    )
  }

  resetMenuAccess (id: string) {
    return this.api.post<{ id: string; code: string; menuAccess: string[] }>(
      `/roles/${id}/menu-access/reset`,
      {},
    )
  }
}

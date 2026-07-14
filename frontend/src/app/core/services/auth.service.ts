import { Injectable, signal, computed, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { Observable, finalize, shareReplay, tap, throwError } from 'rxjs'

import { environment } from '../../../environments/environment'
import { MENU_CATALOG, menuKeyToPath, pathToMenuKeys } from '../navigation/menu.config'

export interface TenantInfo {
  id: string
  code: string
  name: string
  organizationType: string
}

export interface TenantOption {
  tenantId: string
  tenantCode: string
  tenantName: string
  organizationType: string
  userId: string
}

export interface PortalProfile {
  residentId: string
  residentType: string
  unitId: string
  unitCode: string
  condominiumId: string
  condominiumName: string
  condominiumCode: string
}

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  tenantId: string
  permissions: string[]
  menuAccess?: string[]
  roleCodes?: string[]
  roleNames?: string[]
  portal?: PortalProfile | null
  tenant?: TenantInfo
}

export interface LoginResponse {
  requiresTenantSelection?: boolean
  tenants?: TenantOption[]
  user?: AuthUser
  availableTenants?: TenantOption[]
  accessToken?: string
  refreshToken?: string
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient)
  private readonly router = inject(Router)

  private readonly _user = signal<AuthUser | null>(this.loadUser())
  private readonly _accessToken = signal<string | null>(localStorage.getItem('accessToken'))
  private readonly _refreshToken = signal<string | null>(localStorage.getItem('refreshToken'))
  private readonly _availableTenants = signal<TenantOption[]>(this.loadAvailableTenants())
  private refreshInFlight: Observable<{ accessToken: string; refreshToken: string }> | null = null

  readonly user = this._user.asReadonly()
  readonly availableTenants = this._availableTenants.asReadonly()
  readonly isAuthenticated = computed(() => !!this._accessToken())
  readonly permissions = computed(() => this._user()?.permissions ?? [])
  readonly menuAccess = computed(() => this._user()?.menuAccess ?? [])
  readonly roleCodes = computed(() => this._user()?.roleCodes ?? [])
  readonly roleNames = computed(() => this._user()?.roleNames ?? [])
  readonly currentTenant = computed(() => this._user()?.tenant ?? null)
  readonly hasMultipleTenants = computed(() => this._availableTenants().length > 1)

  accessToken = () => this._accessToken()
  refreshToken = () => this._refreshToken()

  login (email: string, password: string, tenantId?: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        email,
        password,
        ...(tenantId ? { tenantId } : {}),
      })
      .pipe(tap((res) => {
        if (!res.requiresTenantSelection && res.user && res.accessToken && res.refreshToken) {
          this.persistSession(res)
        }
      }))
  }

  switchTenant (tenantId: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/switch-tenant`, { tenantId })
      .pipe(
        tap((res) => {
          if (res.user && res.accessToken && res.refreshToken) {
            this.persistSession(res)
          }
        }),
      )
  }

  reloadProfile () {
    return this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`).pipe(
      tap((user) => {
        this._user.set(user)
        localStorage.setItem('user', JSON.stringify(user))
      }),
    )
  }

  refreshAvailableTenants () {
    return this.http
      .get<TenantOption[]>(`${environment.apiUrl}/auth/available-tenants`)
      .pipe(tap((tenants) => {
        this._availableTenants.set(tenants)
        localStorage.setItem('availableTenants', JSON.stringify(tenants))
      }))
  }

  refresh () {
    const token = this._refreshToken()
    if (!token) {
      return throwError(() => new Error('No refresh token'))
    }
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.http
        .post<{ accessToken: string; refreshToken: string }>(
          `${environment.apiUrl}/auth/refresh`,
          { refreshToken: token },
        )
        .pipe(
          tap((res) => {
            this._accessToken.set(res.accessToken)
            this._refreshToken.set(res.refreshToken)
            localStorage.setItem('accessToken', res.accessToken)
            localStorage.setItem('refreshToken', res.refreshToken)
          }),
          finalize(() => {
            this.refreshInFlight = null
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        )
    }
    return this.refreshInFlight
  }

  sessionExpired () {
    this.refreshInFlight = null
    this.clearSession()
  }

  logout () {
    const refreshToken = this._refreshToken()
    if (refreshToken) {
      this.http
        .post(`${environment.apiUrl}/auth/logout`, { refreshToken })
        .subscribe({ complete: () => this.clearSession() })
    } else {
      this.clearSession()
    }
  }

  hasPermission (permission: string) {
    return this.permissions().includes(permission)
  }

  hasMenu (menuKey: string) {
    return this.menuAccess().includes(menuKey)
  }

  canAccessPath (url: string) {
    const keys = pathToMenuKeys(url)
    if (!keys.length) return true
    const allowed = this.menuAccess()
    return keys.some((k) => allowed.includes(k))
  }

  homePath () {
    const allowed = new Set(this.menuAccess())
    const priority = [
      'dashboard',
      'owner-home',
      'my-reservations',
      'my-account',
      'reservations',
      'account-statement',
      'finance',
      'estructuras',
      'settings',
    ]
    for (const key of priority) {
      if (allowed.has(key)) {
        const path = menuKeyToPath(key)
        if (path) return path
      }
    }
    const first = MENU_CATALOG.find((m) => allowed.has(m.key))
    return first?.path ?? '/reservations'
  }

  private persistSession (res: LoginResponse) {
    if (!res.user || !res.accessToken || !res.refreshToken) return

    this._user.set(res.user)
    this._accessToken.set(res.accessToken)
    this._refreshToken.set(res.refreshToken)

    const tenants = res.availableTenants ?? []
    this._availableTenants.set(tenants)

    localStorage.setItem('user', JSON.stringify(res.user))
    localStorage.setItem('accessToken', res.accessToken)
    localStorage.setItem('refreshToken', res.refreshToken)
    localStorage.setItem('availableTenants', JSON.stringify(tenants))
  }

  private clearSession () {
    this._user.set(null)
    this._accessToken.set(null)
    this._refreshToken.set(null)
    this._availableTenants.set([])
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('availableTenants')
    this.router.navigate(['/auth/login'])
  }

  private loadUser (): AuthUser | null {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  }

  private loadAvailableTenants (): TenantOption[] {
    const raw = localStorage.getItem('availableTenants')
    return raw ? JSON.parse(raw) : []
  }
}

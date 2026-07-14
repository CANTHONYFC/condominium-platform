import { Component, computed, inject, signal } from '@angular/core'
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'
import { filter } from 'rxjs/operators'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'

import { AuthService } from '../../core/services/auth.service'
import { ThemeService } from '../../core/services/theme.service'

interface NavItem {
  path: string
  label: string
  menuKey: string
  exact?: boolean
}

interface NavGroup {
  id: string
  title: string
  icon: string
  items: NavItem[]
}

interface NavSingle {
  path: string
  label: string
  icon: string
  menuKey: string
  exact?: boolean
}

const NAV_OWNER: NavSingle[] = [
  { path: '/inicio', label: 'Inicio', icon: 'home', menuKey: 'owner-home', exact: true },
  { path: '/mis-reservas', label: 'Mis reservas', icon: 'event', menuKey: 'my-reservations' },
  { path: '/mi-cuenta', label: 'Mi estado de cuenta', icon: 'account_balance_wallet', menuKey: 'my-account', exact: true },
]

const NAV_TOP: NavSingle[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', menuKey: 'dashboard', exact: true },
  { path: '/finance', label: 'Estado de cuenta', icon: 'account_balance_wallet', menuKey: 'account-statement', exact: true },
  { path: '/reservations', label: 'Reservas', icon: 'event', menuKey: 'reservations' },
]

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'admin',
    title: 'Administración',
    icon: 'apartment',
    items: [
      { path: '/estructuras', label: 'Configuración de estructura', menuKey: 'estructuras' },
      { path: '/owners', label: 'Propietarios', menuKey: 'owners' },
      { path: '/residents', label: 'Residentes', menuKey: 'residents' },
    ],
  },
  {
    id: 'finance',
    title: 'Finanzas',
    icon: 'payments',
    items: [
      { path: '/finance/grid', label: 'Cuadro mensual', menuKey: 'finance-grid', exact: true },
      { path: '/finance', label: 'Cuotas y pagos', menuKey: 'finance', exact: true },
      { path: '/expenses', label: 'Gastos', menuKey: 'expenses' },
      { path: '/reports', label: 'Reportes', menuKey: 'reports' },
    ],
  },
  {
    id: 'operations',
    title: 'Operaciones',
    icon: 'event',
    items: [
      { path: '/maintenance', label: 'Mantenimiento', menuKey: 'maintenance' },
      { path: '/helpdesk', label: 'Mesa de ayuda', menuKey: 'helpdesk' },
    ],
  },
]

const NAV_BOTTOM: NavSingle[] = [
  { path: '/settings', label: 'Configuración', icon: 'settings', menuKey: 'settings' },
]

const NAV_SYSTEM: NavSingle[] = [
  { path: '/tenants', label: 'Empresas clientes', icon: 'domain', menuKey: 'tenants' },
  { path: '/users', label: 'Usuarios', icon: 'group', menuKey: 'users' },
]

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService)
  readonly theme = inject(ThemeService)
  private readonly router = inject(Router)

  readonly currentUrl = signal(this.router.url)

  readonly userName = computed(() => {
    const u = this.auth.user()
    if (!u) return 'Usuario'
    return `${u.firstName} ${u.lastName}`.trim() || u.email
  })

  readonly userRole = computed(() => {
    const names = this.auth.roleNames()
    if (names.length) return names.join(', ')
    const codes = this.auth.roleCodes()
    if (!codes.length) return ''
    const labels: Record<string, string> = {
      ADMIN_GENERAL: 'Administrador general',
      ADMIN: 'Admin',
      ADMINISTRADOR: 'Administrador',
      RESIDENTE: 'Residente',
      PROPIETARIO: 'Propietario',
    }
    return codes.map((c) => labels[c] ?? c).join(', ')
  })

  readonly switchingTenant = signal(false)

  readonly currentTenantId = computed(() => this.auth.user()?.tenantId ?? '')

  readonly topItems = computed(() => {
    const adminTop = NAV_TOP.filter((item) => this.auth.hasMenu(item.menuKey))
    const ownerItems = NAV_OWNER.filter((item) => this.auth.hasMenu(item.menuKey))

    if (this.auth.hasMenu('dashboard')) {
      const home: NavSingle = {
        path: '/dashboard',
        label: 'Inicio',
        icon: 'home',
        menuKey: 'dashboard',
        exact: true,
      }
      const restTop = adminTop.filter((item) => item.menuKey !== 'dashboard')
      const restOwner = ownerItems.filter((item) => item.menuKey !== 'owner-home')
      const merged = [home, ...restTop, ...restOwner]
      const seen = new Set<string>()
      return merged.filter((item) => {
        if (seen.has(item.path)) return false
        seen.add(item.path)
        return true
      })
    }

    if (ownerItems.length) return ownerItems
    return adminTop
  })

  readonly menuGroups = computed(() =>
    NAV_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => this.auth.hasMenu(item.menuKey)),
      }))
      .filter((group) => group.items.length > 0),
  )

  readonly bottomItems = computed(() =>
    NAV_BOTTOM.filter((item) => this.auth.hasMenu(item.menuKey)),
  )

  readonly systemItems = computed(() =>
    NAV_SYSTEM.filter((item) => this.auth.hasMenu(item.menuKey)),
  )

  readonly showPromo = computed(() => this.auth.hasMenu('estructuras'))

  private readonly expandedGroups = signal<Record<string, boolean>>({
    admin: true,
    finance: true,
    operations: false,
  })

  constructor () {
    this.syncExpandedFromRoute(this.router.url)

    if (this.auth.isAuthenticated()) {
      this.auth.refreshAvailableTenants().subscribe()
      if (!this.auth.menuAccess().length || !this.auth.roleNames().length || this.needsProfileRefresh()) {
        this.auth.reloadProfile().subscribe()
      }
    }

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        this.currentUrl.set(e.urlAfterRedirects)
        this.syncExpandedFromRoute(e.urlAfterRedirects)
      })
  }

  isExpanded (groupId: string): boolean {
    return this.expandedGroups()[groupId] ?? false
  }

  toggleGroup (groupId: string): void {
    this.expandedGroups.update((state) => ({
      ...state,
      [groupId]: !state[groupId],
    }))
  }

  isGroupActive (group: NavGroup): boolean {
    return group.items.some((item) => this.isPathActive(item.path, item.exact))
  }

  isPathActive (path: string, exact?: boolean): boolean {
    const url = this.currentUrl()
    if (exact) return url === path || url === `${path}/`
    return url === path || url.startsWith(`${path}/`)
  }

  private syncExpandedFromRoute (url: string): void {
    for (const group of this.menuGroups()) {
      const active = group.items.some((item) => {
        if (item.exact) return url === item.path || url === `${item.path}/`
        return url === item.path || url.startsWith(`${item.path}/`)
      })
      if (active) {
        this.expandedGroups.update((state) => ({ ...state, [group.id]: true }))
      }
    }
  }

  onTenantChange (tenantId: string) {
    if (!tenantId || tenantId === this.currentTenantId() || this.switchingTenant()) return

    this.switchingTenant.set(true)
    this.auth.switchTenant(tenantId).subscribe({
      next: () => {
        this.switchingTenant.set(false)
        void this.router.navigateByUrl(this.auth.homePath())
      },
      error: () => {
        this.switchingTenant.set(false)
      },
    })
  }

  organizationLabel (type: string): string {
    const labels: Record<string, string> = {
      MANAGEMENT_FIRM: 'Administradora',
      CONDOMINIUM: 'Condominio',
      BUILDING: 'Edificio',
    }
    return labels[type] ?? type
  }

  private needsProfileRefresh (): boolean {
    const roles = this.auth.roleCodes()
    const menus = this.auth.menuAccess()
    if (roles.includes('PROPIETARIO') && !menus.includes('owner-home')) return true
    if (roles.includes('RESIDENTE') && !menus.includes('owner-home') && menus.includes('reservations')) return true
    return false
  }
}

import { Routes } from '@angular/router'

import { authGuard, homeRedirectGuard, menuGuard } from './core/guards/auth.guard'
import { MainLayoutComponent } from './layout/main-layout/main-layout.component'
import { LoginComponent } from './features/auth/login/login.component'
import { DashboardComponent } from './features/dashboard/dashboard.component'
import { CondominiumsComponent } from './features/condominiums/condominiums.component'
import { StructureComponent } from './features/condominiums/structure/structure.component'
import { OwnersComponent } from './features/owners/owners.component'
import { OwnerDetailComponent } from './features/owners/owner-detail.component'
import { FinanceComponent } from './features/finance/finance.component'
import { ExpensesComponent } from './features/expenses/expenses.component'
import { MaintenanceComponent } from './features/maintenance/maintenance.component'
import { ReservationsComponent } from './features/reservations/reservations.component'
import { ReportsComponent } from './features/reports/reports.component'
import { TenantsComponent } from './features/tenants/tenants.component'
import { UsersComponent } from './features/users/users.component'
import { SettingsComponent } from './features/settings/settings.component'
import { PlaceholderComponent } from './shared/components/placeholder/placeholder.component'
import { OwnerHomeComponent } from './features/owner-portal/owner-home/owner-home.component'
import { MyReservationsComponent } from './features/owner-portal/my-reservations/my-reservations.component'
import { MyAccountComponent } from './features/owner-portal/my-account/my-account.component'

const placeholder = (title: string) => ({
  component: PlaceholderComponent,
  data: { title },
})

const guarded = (config: object) => ({
  ...config,
  canActivate: [menuGuard],
})

export const routes: Routes = [
  { path: 'auth/login', component: LoginComponent },
  {
    path: '',
    canActivate: [authGuard],
    component: MainLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], component: DashboardComponent },
      guarded({ path: 'dashboard', component: DashboardComponent }),
      guarded({ path: 'inicio', component: OwnerHomeComponent }),
      guarded({ path: 'mis-reservas', component: MyReservationsComponent }),
      guarded({ path: 'mi-cuenta', component: MyAccountComponent }),
      guarded({ path: 'estructuras', component: CondominiumsComponent }),
      guarded({ path: 'estructuras/:id', component: StructureComponent }),
      { path: 'condominiums', redirectTo: 'estructuras', pathMatch: 'full' },
      { path: 'condominiums/:id/structure', redirectTo: 'estructuras/:id', pathMatch: 'full' },
      guarded({ path: 'owners', component: OwnersComponent }),
      guarded({ path: 'owners/:id', component: OwnerDetailComponent }),
      guarded({ path: 'residents', ...placeholder('Residentes') }),
      guarded({ path: 'finance', component: FinanceComponent, data: { tabIndex: 0 } }),
      guarded({ path: 'finance/grid', component: FinanceComponent, data: { tabIndex: 1 } }),
      guarded({ path: 'expenses', component: ExpensesComponent }),
      guarded({ path: 'maintenance', component: MaintenanceComponent }),
      guarded({ path: 'reservations', component: ReservationsComponent }),
      guarded({ path: 'helpdesk', ...placeholder('Mesa de ayuda') }),
      guarded({ path: 'reports', component: ReportsComponent }),
      guarded({ path: 'settings', component: SettingsComponent }),
      guarded({ path: 'tenants', component: TenantsComponent }),
      guarded({ path: 'users', component: UsersComponent }),
    ],
  },
  { path: '**', canActivate: [homeRedirectGuard], component: DashboardComponent },
]

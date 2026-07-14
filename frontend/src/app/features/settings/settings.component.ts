import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatCardModule } from '@angular/material/card'
import { MatTabsModule } from '@angular/material/tabs'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

import { AuthService } from '../../core/services/auth.service'
import { NotifyService } from '../../core/services/notify.service'
import { RolesApiService, type AppRole } from '../../core/services/users-api.service'
import { MENU_CATALOG, MENU_SECTION_LABELS } from '../../core/navigation/menu.config'

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  styles: [`
    .menu-grid {
      display: grid;
      gap: 16px;
      margin-top: 16px;
    }
    .menu-section h3 {
      margin: 0 0 8px;
      font-size: 14px;
      color: #475569;
    }
    .menu-section mat-checkbox {
      display: block;
      margin: 4px 0;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .hint {
      margin: 0 0 12px;
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
    }
  `],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title mb-0">Configuración</h1>
        <p class="page-subtitle">Accesos al menú según rol de usuario</p>
      </div>
    </div>

    @if (!canManage()) {
      <mat-card class="content-card p-4">
        <p class="hint mb-0">No tienes permiso para administrar accesos por rol.</p>
      </mat-card>
    } @else {
      <mat-card class="content-card p-4">
        <p class="hint">
          Define qué opciones del menú lateral verá cada rol. Los cambios aplican al volver a iniciar sesión
          o al guardar si eres tú mismo en ese rol.
        </p>

        @if (loading()) {
          <mat-spinner diameter="36"></mat-spinner>
        } @else {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Rol</mat-label>
            <mat-select [(ngModel)]="selectedRoleId" (selectionChange)="onRoleChange()">
              @for (r of roles(); track r.id) {
                <mat-option [value]="r.id">{{ r.name }} ({{ r.code }})</mat-option>
              }
            </mat-select>
          </mat-form-field>

          @if (selectedRole(); as role) {
            <div class="menu-grid">
              @for (section of sections(); track section) {
                <div class="menu-section">
                  <h3>{{ sectionLabel(section) }}</h3>
                  @for (item of itemsBySection(section); track item.key) {
                    <mat-checkbox
                      [checked]="selectedKeys().includes(item.key)"
                      (change)="toggleKey(item.key, $event.checked)"
                    >
                      {{ item.label }}
                    </mat-checkbox>
                  }
                </div>
              }
            </div>

            <div class="actions">
              <button mat-flat-button color="primary" [disabled]="saving() || !selectedKeys().length" (click)="save()">
                Guardar accesos
              </button>
              <button mat-stroked-button [disabled]="saving()" (click)="reset()">Restaurar por defecto</button>
            </div>
          }
        }
      </mat-card>
    }
  `,
})
export class SettingsComponent implements OnInit {
  private readonly rolesApi = inject(RolesApiService)
  private readonly auth = inject(AuthService)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly saving = signal(false)
  readonly roles = signal<AppRole[]>([])
  readonly selectedKeys = signal<string[]>([])
  selectedRoleId = ''

  readonly canManage = computed(() => this.auth.hasPermission('roles:update'))

  readonly sections = computed(() =>
    [...new Set(MENU_CATALOG.map((m) => m.section))],
  )

  ngOnInit () {
    if (!this.canManage()) {
      this.loading.set(false)
      return
    }
    this.rolesApi.list({ limit: 100 }).subscribe({
      next: (r) => {
        this.roles.set(r.data)
        if (r.data.length) {
          this.selectedRoleId = r.data[0].id
          this.selectedKeys.set([...(r.data[0].menuAccess ?? [])])
        }
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
  }

  selectedRole () {
    return this.roles().find((r) => r.id === this.selectedRoleId) ?? null
  }

  sectionLabel (section: string) {
    return MENU_SECTION_LABELS[section] ?? section
  }

  itemsBySection (section: string) {
    return MENU_CATALOG.filter((m) => m.section === section)
  }

  onRoleChange () {
    const role = this.selectedRole()
    this.selectedKeys.set([...(role?.menuAccess ?? [])])
  }

  toggleKey (key: string, checked: boolean) {
    const current = new Set(this.selectedKeys())
    if (checked) current.add(key)
    else current.delete(key)
    this.selectedKeys.set([...current])
  }

  save () {
    if (!this.selectedRoleId) return
    this.saving.set(true)
    this.rolesApi.updateMenuAccess(this.selectedRoleId, this.selectedKeys()).subscribe({
      next: (role) => {
        this.roles.update((list) => list.map((r) => (r.id === role.id ? { ...r, menuAccess: role.menuAccess } : r)))
        this.saving.set(false)
        this.notify.success('Accesos guardados')
        this.auth.reloadProfile().subscribe()
      },
      error: () => {
        this.saving.set(false)
        this.notify.error('No se pudieron guardar los accesos')
      },
    })
  }

  reset () {
    if (!this.selectedRoleId) return
    this.saving.set(true)
    this.rolesApi.resetMenuAccess(this.selectedRoleId).subscribe({
      next: (role) => {
        this.selectedKeys.set([...role.menuAccess])
        this.roles.update((list) => list.map((r) => (r.id === role.id ? { ...r, menuAccess: role.menuAccess } : r)))
        this.saving.set(false)
        this.notify.success('Accesos restaurados')
        this.auth.reloadProfile().subscribe()
      },
      error: () => {
        this.saving.set(false)
        this.notify.error('Error al restaurar')
      },
    })
  }
}

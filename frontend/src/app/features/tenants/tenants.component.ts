import { Component, inject, OnInit, signal } from '@angular/core'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatTableModule } from '@angular/material/table'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatDividerModule } from '@angular/material/divider'

import {
  TenantsApiService,
  type CreateTenantPayload,
  type Tenant,
} from '../../core/services/tenants-api.service'
import { NotifyService } from '../../core/services/notify.service'
import { AuthService } from '../../core/services/auth.service'
import { PageHeadingComponent } from '../../shared/components/page-heading/page-heading.component'

@Component({
  selector: 'app-tenant-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Editar empresa' : 'Nueva empresa cliente' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="tenant-form">
        <p class="section-label">Datos de la empresa</p>
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email de contacto</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Tipo de organización</mat-label>
          <mat-select formControlName="organizationType">
            <mat-option value="MANAGEMENT_FIRM">Empresa administradora</mat-option>
            <mat-option value="CONDOMINIUM">Condominio</mat-option>
            <mat-option value="BUILDING">Edificio / departamentos</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cupo de usuarios</mat-label>
          <input matInput type="number" formControlName="maxUsers" />
        </mat-form-field>

        @if (!data.item) {
          <mat-divider class="section-divider"></mat-divider>
          <p class="section-label">Administrador principal</p>
          <p class="section-hint">Esta persona podrá ingresar al panel y configurar la empresa.</p>

          <div formGroupName="admin" class="admin-fields">
            <mat-form-field appearance="outline">
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="firstName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Apellidos</mat-label>
              <input matInput formControlName="lastName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Correo de acceso</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="off" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Contraseña inicial</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" />
              <mat-hint>Mínimo 8 caracteres. Compártela con el administrador.</mat-hint>
            </mat-form-field>
          </div>
        } @else {
          <p class="section-hint">Código interno: <code>{{ data.item.code }}</code></p>
        }
      </form>
      @if (!data.item) {
        <p class="hint">Se crean roles del sistema: Admin general, Admin, Administrador y Residente.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .tenant-form { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
    .admin-fields { display: flex; flex-direction: column; gap: 4px; }
    .section-label { font-size: 13px; font-weight: 600; color: #334155; margin: 0 0 4px; }
    .section-hint { font-size: 12px; color: #64748b; margin: 0 0 8px; line-height: 1.4; }
    .section-divider { margin: 12px 0 16px; }
    .hint { font-size: 12px; color: #64748b; margin-top: 12px; }
    code { font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
  `],
})
export class TenantFormDialogComponent {
  readonly data = inject<{ item?: Tenant }>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<TenantFormDialogComponent>)
  private readonly fb = inject(FormBuilder)

  readonly form = this.fb.nonNullable.group({
    name: [this.data.item?.name ?? '', Validators.required],
    email: [this.data.item?.email ?? '', [Validators.required, Validators.email]],
    organizationType: [this.data.item?.organizationType ?? 'MANAGEMENT_FIRM', Validators.required],
    maxUsers: [this.data.item?.maxUsers ?? 10, [Validators.required, Validators.min(1)]],
    admin: this.fb.nonNullable.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    }),
  })

  constructor () {
    if (this.data.item) {
      this.form.controls.admin.disable()
    }
  }

  save () {
    if (this.form.invalid) return

    const { name, email, organizationType, maxUsers, admin } = this.form.getRawValue()

    if (this.data.item) {
      this.ref.close({ name, email, organizationType, maxUsers })
      return
    }

    const payload: CreateTenantPayload = {
      name,
      email,
      organizationType,
      maxUsers,
      admin,
    }
    this.ref.close(payload)
  }
}

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatTableModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule, PageHeadingComponent],
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.scss',
})
export class TenantsComponent implements OnInit {
  private readonly api = inject(TenantsApiService)
  private readonly auth = inject(AuthService)
  private readonly dialog = inject(MatDialog)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly items = signal<Tenant[]>([])
  readonly cols = ['code', 'name', 'type', 'users', 'maxUsers', 'status', 'actions']

  readonly canManage = this.auth.hasPermission('tenants:create')
  readonly canEdit = this.auth.hasPermission('tenants:update')

  orgLabel (t: Tenant) {
    if (t.organizationType === 'CONDOMINIUM') return 'Condominio'
    if (t.organizationType === 'BUILDING') return 'Edificio'
    return 'Administradora'
  }

  ngOnInit () { this.load() }

  load () {
    this.loading.set(true)
    this.api.list({ limit: 100 }).subscribe({
      next: (r) => { this.items.set(r.data); this.loading.set(false) },
      error: () => { this.notify.error('Sin permiso o error al cargar empresas'); this.loading.set(false) },
    })
  }

  openCreate () {
    const ref = this.dialog.open(TenantFormDialogComponent, { width: '520px', data: {} })
    ref.afterClosed().subscribe((v: CreateTenantPayload | undefined) => {
      if (!v) return
      this.api.create(v).subscribe({
        next: () => {
          this.notify.success('Empresa creada con su administrador principal')
          this.load()
        },
        error: () => this.notify.error('Error al crear. Verifica que el correo del admin no exista en otra empresa.'),
      })
    })
  }

  openEdit (item: Tenant) {
    const ref = this.dialog.open(TenantFormDialogComponent, { width: '520px', data: { item } })
    ref.afterClosed().subscribe((v: Partial<Tenant> | undefined) => {
      if (!v) return
      this.api.update(item.id, v).subscribe({
        next: () => {
          this.notify.success('Empresa actualizada')
          this.load()
        },
        error: () => this.notify.error('Error al actualizar la empresa'),
      })
    })
  }

  toggleActive (item: Tenant) {
    this.api.update(item.id, { isActive: !item.isActive }).subscribe({
      next: () => { this.notify.success(item.isActive ? 'Empresa desactivada' : 'Empresa activada'); this.load() },
      error: () => this.notify.error('Error'),
    })
  }
}

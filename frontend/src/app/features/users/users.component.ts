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

import { UsersApiService, RolesApiService, type AppUser } from '../../core/services/users-api.service'
import { NotifyService } from '../../core/services/notify.service'
import { PageHeadingComponent } from '../../shared/components/page-heading/page-heading.component'

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Nuevo usuario</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-1 pt-2">
        <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput type="email" formControlName="email" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Contraseña</mat-label><input matInput type="password" formControlName="password" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Nombres</mat-label><input matInput formControlName="firstName" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Apellidos</mat-label><input matInput formControlName="lastName" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Rol</mat-label>
          <mat-select formControlName="roleCode">
            @for (r of data.roles; track r.code) {
              <mat-option [value]="r.code">{{ r.name }} ({{ r.code }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="ref.close(form.getRawValue())">Crear</button>
    </mat-dialog-actions>
  `,
})
export class UserFormDialogComponent {
  readonly data = inject<{ roles: Array<{ code: string; name: string }> }>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<UserFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    roleCode: ['ADMINISTRADOR', Validators.required],
  })
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatTableModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule, PageHeadingComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private readonly usersApi = inject(UsersApiService)
  private readonly rolesApi = inject(RolesApiService)
  private readonly dialog = inject(MatDialog)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly items = signal<AppUser[]>([])
  readonly roles = signal<Array<{ code: string; name: string }>>([])
  readonly cols = ['name', 'email', 'roles', 'status', 'actions']

  ngOnInit () {
    this.rolesApi.list({ limit: 50 }).subscribe({ next: (r) => this.roles.set(r.data) })
    this.load()
  }

  load () {
    this.loading.set(true)
    this.usersApi.list({ limit: 100 }).subscribe({
      next: (r) => { this.items.set(r.data); this.loading.set(false) },
      error: () => { this.notify.error('Error al cargar usuarios'); this.loading.set(false) },
    })
  }

  displayName (u: AppUser) {
    return `${u.firstName} ${u.lastName}`.trim()
  }

  roleNames (u: AppUser) {
    return u.roles?.map((r) => r.name).join(', ') || '—'
  }

  openCreate () {
    const ref = this.dialog.open(UserFormDialogComponent, {
      width: '440px',
      data: { roles: this.roles() },
    })
    ref.afterClosed().subscribe((v) => {
      if (!v) return
      this.usersApi.create(v).subscribe({
        next: () => { this.notify.success('Usuario creado'); this.load() },
        error: (e) => this.notify.error(e?.error?.message || 'Error — verifique cupo de usuarios'),
      })
    })
  }

  toggleStatus (u: AppUser) {
    const next = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    this.usersApi.setStatus(u.id, next).subscribe({
      next: () => { this.notify.success(next === 'ACTIVE' ? 'Usuario activado' : 'Usuario inhabilitado'); this.load() },
      error: () => this.notify.error('Error'),
    })
  }
}

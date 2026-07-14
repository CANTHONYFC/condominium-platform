import { Component, inject, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSelectModule } from '@angular/material/select'

import { AuthService, type TenantOption } from '../../../core/services/auth.service'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder)
  private readonly auth = inject(AuthService)
  private readonly router = inject(Router)

  readonly loading = signal(false)
  readonly error = signal<string | null>(null)
  readonly hidePassword = signal(true)
  readonly tenantOptions = signal<TenantOption[]>([])
  readonly showTenantPicker = signal(false)

  readonly form = this.fb.nonNullable.group({
    email: ['admin@demo.com', [Validators.required, Validators.email]],
    password: ['Admin123!', [Validators.required, Validators.minLength(8)]],
    tenantId: [''],
  })

  togglePassword () {
    this.hidePassword.update((v) => !v)
  }

  submit () {
    if (this.form.invalid) return
    this.loading.set(true)
    this.error.set(null)

    const { email, password, tenantId } = this.form.getRawValue()
    const selectedTenantId = tenantId || undefined

    this.auth.login(email, password, selectedTenantId).subscribe({
      next: (res) => {
        this.loading.set(false)

        if (res.requiresTenantSelection && res.tenants?.length) {
          this.tenantOptions.set(res.tenants)
          this.showTenantPicker.set(true)
          this.form.controls.tenantId.setValidators([Validators.required])
          this.form.controls.tenantId.updateValueAndValidity()
          return
        }

        this.router.navigate([this.auth.homePath()])
      },
      error: () => {
        this.loading.set(false)
        this.error.set('Credenciales inválidas. Verifica tu correo y contraseña.')
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
}

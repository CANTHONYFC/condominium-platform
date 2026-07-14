import { Component, inject, OnInit, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatTableModule } from '@angular/material/table'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog } from '@angular/material/dialog'
import { MatMenuModule } from '@angular/material/menu'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

import { OwnersApiService } from '../../core/services/owners-api.service'
import { CondominiumsApiService } from '../../core/services/condominiums-api.service'
import { AuthService } from '../../core/services/auth.service'
import { NotifyService } from '../../core/services/notify.service'
import type { Owner } from '../../core/models/domain.models'
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component'
import { PageHeadingComponent } from '../../shared/components/page-heading/page-heading.component'
import { OwnerFormDialogComponent } from './owner-dialogs'
import { formatOwnerLocations, formatUnitLocation } from '../../shared/utils/unit-location'
import { environment } from '../../../environments/environment'
import { ApiService } from '../../core/services/api.service'

@Component({
  selector: 'app-owners',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    PageHeadingComponent,
  ],
  templateUrl: './owners.component.html',
  styleUrl: './owners.component.scss',
})
export class OwnersComponent implements OnInit {
  private readonly api = inject(OwnersApiService)
  private readonly condosApi = inject(CondominiumsApiService)
  private readonly auth = inject(AuthService)
  private readonly httpApi = inject(ApiService)
  private readonly dialog = inject(MatDialog)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly items = signal<Owner[]>([])
  readonly cols = ['document', 'name', 'location', 'email', 'status', 'actions']

  ngOnInit () { this.load() }

  load () {
    this.loading.set(true)
    this.api.list({ limit: 100 }).subscribe({
      next: (r) => { this.items.set(r.data); this.loading.set(false) },
      error: () => { this.notify.error('Error al cargar'); this.loading.set(false) },
    })
  }

  displayName (o: Owner) {
    return o.legalName ?? `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim()
  }

  unitLocation (o: Owner) {
    return formatOwnerLocations(o)
  }

  openCreate () {
    this.condosApi.list({ limit: 100 }).subscribe({
      next: (condos) => {
        const ref = this.dialog.open(OwnerFormDialogComponent, {
          width: '960px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          data: {
            organizationType: this.auth.currentTenant()?.organizationType ?? 'MANAGEMENT_FIRM',
            condominiums: condos.data,
          },
        })
        ref.afterClosed().subscribe((v) => {
          if (!v) return
          this.api.create(v).subscribe({
            next: () => { this.notify.success('Propietario creado con acceso al portal'); this.load() },
            error: (err) => {
              const msg = err?.error?.message
              this.notify.error(Array.isArray(msg) ? msg[0] : msg ?? 'Error al crear')
            },
          })
        })
      },
      error: () => this.notify.error('No se pudieron cargar los edificios'),
    })
  }

  openEdit (item: Owner) {
    const ref = this.dialog.open(OwnerFormDialogComponent, { width: '480px', data: { item } })
    ref.afterClosed().subscribe((v) => {
      if (!v) return
      this.api.update(item.id, v).subscribe({
        next: () => { this.notify.success('Actualizado'); this.load() },
        error: () => this.notify.error('Error al guardar'),
      })
    })
  }

  confirmDelete (item: Owner) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Eliminar propietario', message: `¿Eliminar a ${this.displayName(item)}?`, confirmLabel: 'Eliminar', danger: true },
    })
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return
      this.api.remove(item.id).subscribe({
        next: () => { this.notify.success('Eliminado'); this.load() },
        error: () => this.notify.error('No se pudo eliminar'),
      })
    })
  }

  exportExcel () {
    this.httpApi.post<{ id: string }>('/exports', { module: 'owners', format: 'EXCEL' }).subscribe({
      next: (job) => this.pollExport(job.id),
      error: () => this.notify.error('Error al exportar'),
    })
  }

  private pollExport (id: string) {
    this.notify.success('Exportación iniciada...')
    const t = setInterval(() => {
      this.httpApi.get<{ status: string; fileUrl?: string }>(`/exports/${id}`).subscribe((job) => {
        if (job.status === 'COMPLETED' && job.fileUrl) {
          clearInterval(t)
          window.open(`${environment.serverUrl}${job.fileUrl}`, '_blank')
          this.notify.success('Exportación lista')
        }
        if (job.status === 'FAILED') { clearInterval(t); this.notify.error('Exportación falló') }
      })
    }, 2000)
  }
}

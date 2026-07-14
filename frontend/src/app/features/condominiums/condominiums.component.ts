import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatTableModule } from '@angular/material/table'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatMenuModule } from '@angular/material/menu'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

import { CondominiumsApiService } from '../../core/services/condominiums-api.service'
import { AuthService } from '../../core/services/auth.service'
import { NotifyService } from '../../core/services/notify.service'
import type { Condominium } from '../../core/models/domain.models'
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component'
import { CondominiumFormDialogComponent } from './condominium-form.dialog'
import { PageHeadingComponent } from '../../shared/components/page-heading/page-heading.component'

@Component({
  selector: 'app-condominiums',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatDialogModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    PageHeadingComponent,
  ],
  templateUrl: './condominiums.component.html',
  styleUrl: './condominiums.component.scss',
})
export class CondominiumsComponent implements OnInit {
  private readonly api = inject(CondominiumsApiService)
  private readonly auth = inject(AuthService)
  private readonly dialog = inject(MatDialog)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly items = signal<Condominium[]>([])
  readonly cols = ['code', 'name', 'city', 'units', 'status', 'actions']

  private readonly organizationType = computed(() => this.auth.currentTenant()?.organizationType ?? 'MANAGEMENT_FIRM')

  readonly pageSubtitle = computed(() => {
    switch (this.organizationType()) {
      case 'BUILDING':
        return 'Registra los edificios de departamentos que administra tu empresa'
      case 'CONDOMINIUM':
        return 'Registra los condominios con torres, pisos y domicilios que administra tu empresa'
      default:
        return 'Registra edificios y condominios que administra tu empresa'
    }
  })

  readonly createButtonLabel = computed(() => {
    switch (this.organizationType()) {
      case 'BUILDING':
        return 'Nuevo edificio'
      case 'CONDOMINIUM':
        return 'Nuevo condominio'
      default:
        return 'Nuevo edificio / condominio'
    }
  })

  readonly emptyStateText = computed(() => {
    switch (this.organizationType()) {
      case 'BUILDING':
        return 'No hay edificios registrados. Crea el primero.'
      case 'CONDOMINIUM':
        return 'No hay condominios registrados. Crea el primero.'
      default:
        return 'No hay edificios ni condominios registrados. Crea el primero.'
    }
  })

  ngOnInit () {
    this.load()
  }

  load () {
    this.loading.set(true)
    this.api.list({ limit: 100 }).subscribe({
      next: (res) => {
        this.items.set(res.data)
        this.loading.set(false)
      },
      error: () => {
        this.notify.error('No se pudieron cargar los registros')
        this.loading.set(false)
      },
    })
  }

  openCreate () {
    this.openForm()
  }

  openEdit (item: Condominium) {
    this.openForm(item)
  }

  private openForm (item?: Condominium) {
    const ref = this.dialog.open(CondominiumFormDialogComponent, {
      width: '480px',
      data: { item, organizationType: this.organizationType() },
    })
    ref.afterClosed().subscribe((value) => {
      if (!value) return
      const req = item
        ? this.api.update(item.id, value)
        : this.api.create(value)
      req.subscribe({
        next: () => {
          this.notify.success(item ? 'Registro actualizado' : 'Registro creado')
          this.load()
        },
        error: () => this.notify.error('Error al guardar'),
      })
    })
  }

  confirmDelete (item: Condominium) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar registro',
        message: `¿Eliminar "${item.name}"? Esta acción es reversible (soft delete).`,
        confirmLabel: 'Eliminar',
        danger: true,
      },
    })
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return
      this.api.remove(item.id).subscribe({
        next: () => {
          this.notify.success('Registro eliminado')
          this.load()
        },
        error: () => this.notify.error('No se pudo eliminar'),
      })
    })
  }
}

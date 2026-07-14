import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { DatePipe } from '@angular/common'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog } from '@angular/material/dialog'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

import { OwnersApiService } from '../../core/services/owners-api.service'
import { CondominiumsApiService } from '../../core/services/condominiums-api.service'
import { AuthService } from '../../core/services/auth.service'
import { NotifyService } from '../../core/services/notify.service'
import type { Owner } from '../../core/models/domain.models'
import { AssignOwnershipDialogComponent, OwnerDocumentDialogComponent } from './owner-dialogs'
import { formatUnitLocation } from '../../shared/utils/unit-location'
import { PageHeadingComponent } from '../../shared/components/page-heading/page-heading.component'

@Component({
  selector: 'app-owner-detail',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeadingComponent,
  ],
  templateUrl: './owner-detail.component.html',
  styleUrl: './owner-detail.component.scss',
})
export class OwnerDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly ownersApi = inject(OwnersApiService)
  private readonly condosApi = inject(CondominiumsApiService)
  private readonly auth = inject(AuthService)
  private readonly dialog = inject(MatDialog)
  private readonly notify = inject(NotifyService)

  ownerId = ''
  readonly loading = signal(true)
  readonly owner = signal<Owner | null>(null)

  ngOnInit () {
    this.ownerId = this.route.snapshot.paramMap.get('id')!
    this.load()
  }

  load () {
    this.loading.set(true)
    this.ownersApi.get(this.ownerId).subscribe({
      next: (o) => { this.owner.set(o); this.loading.set(false) },
      error: () => { this.notify.error('Propietario no encontrado'); this.loading.set(false) },
    })
  }

  displayName (o: Owner) {
    return o.legalName ?? `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim()
  }

  unitLocation (ownership: { unit?: { code?: string; floor?: { number?: number; tower?: { code?: string; name?: string } } } }) {
    return formatUnitLocation(ownership.unit as never)
  }

  assignUnit () {
    this.condosApi.list({ limit: 100 }).subscribe((r) => {
      const owner = this.owner()
      const ref = this.dialog.open(AssignOwnershipDialogComponent, {
        width: '720px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        data: {
          condominiums: r.data,
          organizationType: this.auth.currentTenant()?.organizationType,
          showPassword: !!owner?.email,
        },
      })
      ref.afterClosed().subscribe((v) => {
        if (!v) return
        this.ownersApi.assignOwnership(this.ownerId, v).subscribe({
          next: () => { this.notify.success('Unidad asignada'); this.load() },
          error: (err) => {
            const msg = err?.error?.message
            this.notify.error(Array.isArray(msg) ? msg[0] : msg ?? 'Error al asignar')
          },
        })
      })
    })
  }

  removeOwnership (ownershipId: string) {
    this.ownersApi.removeOwnership(this.ownerId, ownershipId).subscribe({
      next: () => { this.notify.success('Copropiedad removida'); this.load() },
      error: () => this.notify.error('Error'),
    })
  }

  addDocument () {
    const ref = this.dialog.open(OwnerDocumentDialogComponent, { width: '440px' })
    ref.afterClosed().subscribe((v) => {
      if (!v) return
      this.ownersApi.addDocument(this.ownerId, v).subscribe({
        next: () => { this.notify.success('Documento agregado'); this.load() },
        error: () => this.notify.error('Error'),
      })
    })
  }

  removeDocument (docId: string) {
    this.ownersApi.removeDocument(this.ownerId, docId).subscribe({
      next: () => { this.notify.success('Documento eliminado'); this.load() },
      error: () => this.notify.error('Error'),
    })
  }
}

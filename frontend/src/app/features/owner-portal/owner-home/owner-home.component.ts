import { Component, inject, OnInit, signal } from '@angular/core'
import { DatePipe, DecimalPipe } from '@angular/common'
import { RouterLink } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

import { PortalApiService, type PortalHome } from '../../../core/services/portal-api.service'
import { NotifyService } from '../../../core/services/notify.service'
import { PageHeadingComponent } from '../../../shared/components/page-heading/page-heading.component'

@Component({
  selector: 'app-owner-home',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    PageHeadingComponent,
  ],
  templateUrl: './owner-home.component.html',
  styleUrl: './owner-home.component.scss',
})
export class OwnerHomeComponent implements OnInit {
  private readonly portalApi = inject(PortalApiService)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly home = signal<PortalHome | null>(null)

  ngOnInit () {
    this.portalApi.getHome().subscribe({
      next: (data) => {
        this.home.set(data)
        this.loading.set(false)
      },
      error: () => {
        this.notify.error('No se pudo cargar tu inicio')
        this.loading.set(false)
      },
    })
  }
}

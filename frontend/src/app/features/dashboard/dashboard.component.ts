import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSelectModule } from '@angular/material/select'
import { FormsModule } from '@angular/forms'

import { DashboardApiService } from '../../core/services/dashboard-api.service'
import { CondominiumsApiService } from '../../core/services/condominiums-api.service'
import type { Condominium, DashboardOverview } from '../../core/models/domain.models'
import { PageHeadingComponent } from '../../shared/components/page-heading/page-heading.component'

interface HeroKpi {
  label: string
  value: string
  hint?: string
  icon: string
  tone: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'slate'
  link?: string
}

interface BarPoint {
  label: string
  income: number
  expenses: number
  incomePct: number
  expensePct: number
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    PageHeadingComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardApi = inject(DashboardApiService)
  private readonly condosApi = inject(CondominiumsApiService)

  readonly loading = signal(true)
  readonly overview = signal<DashboardOverview | null>(null)
  readonly condominiums = signal<Condominium[]>([])
  selectedCondoId = ''

  readonly heroKpis = computed(() => {
    const data = this.overview()
    if (!data) return [] as HeroKpi[]
    return [
      {
        label: 'Deuda por morosidad',
        value: `S/ ${this.formatMoney(data.morosityDebt)}`,
        hint: `${data.morosity} cuota${data.morosity === 1 ? '' : 's'} pendiente${data.morosity === 1 ? '' : 's'}`,
        icon: 'warning_amber',
        tone: 'red',
        link: '/finance',
      },
      {
        label: 'Ingresos del mes',
        value: `S/ ${this.formatMoney(data.incomeMonth)}`,
        hint: 'Pagos de cuotas registrados',
        icon: 'trending_up',
        tone: 'green',
      },
      {
        label: 'Egresos del mes',
        value: `S/ ${this.formatMoney(data.expensesMonth)}`,
        hint: 'Gastos operativos',
        icon: 'trending_down',
        tone: 'orange',
      },
      {
        label: 'Balance del mes',
        value: `S/ ${this.formatMoney(data.netMonth)}`,
        hint: data.netMonth >= 0 ? 'Resultado positivo' : 'Resultado negativo',
        icon: 'account_balance_wallet',
        tone: data.netMonth >= 0 ? 'blue' : 'red',
      },
    ] satisfies HeroKpi[]
  })

  readonly chartBars = computed(() => {
    const data = this.overview()
    if (!data?.monthlyFinance.length) return [] as BarPoint[]

    const max = Math.max(
      ...data.monthlyFinance.flatMap((m) => [m.income, m.expenses]),
      1,
    )

    return data.monthlyFinance.map((m) => ({
      label: m.label,
      income: m.income,
      expenses: m.expenses,
      incomePct: (m.income / max) * 100,
      expensePct: (m.expenses / max) * 100,
    }))
  })

  readonly feeStatusTotal = computed(() => {
    const s = this.overview()?.feeStatus
    if (!s) return 0
    return s.pending + s.partial + s.overdue + s.paid + s.cancelled
  })

  readonly feeStatusSlices = computed(() => {
    const s = this.overview()?.feeStatus
    const total = this.feeStatusTotal()
    if (!s || !total) {
      return [{ key: 'paid', label: 'Pagadas', count: 0, pct: 0, start: 0, color: '#16a34a' }]
    }

    const items = [
      { key: 'paid', label: 'Pagadas', count: s.paid, color: '#16a34a' },
      { key: 'pending', label: 'Pendientes', count: s.pending, color: '#2563eb' },
      { key: 'partial', label: 'Parciales', count: s.partial, color: '#ea580c' },
      { key: 'overdue', label: 'Vencidas', count: s.overdue, color: '#dc2626' },
    ].filter((i) => i.count > 0)

    let cursor = 0
    return items.map((item) => {
      const pct = (item.count / total) * 100
      const slice = { ...item, pct, start: cursor }
      cursor += pct
      return slice
    })
  })

  readonly donutGradient = computed(() => {
    const slices = this.feeStatusSlices()
    if (!slices.length) return 'conic-gradient(#e2e8f0 0 100%)'

    const parts = slices.map((s) => {
      const end = s.start + s.pct
      return `${s.color} ${s.start}% ${end}%`
    })
    return `conic-gradient(${parts.join(', ')})`
  })

  readonly updatedLabel = computed(() => {
    const raw = this.overview()?.updatedAt
    if (!raw) return ''
    return new Date(raw).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  })

  ngOnInit () {
    this.condosApi.list({ limit: 100 }).subscribe({
      next: (r) => {
        this.condominiums.set(r.data)
        if (r.data.length) {
          this.selectedCondoId = r.data[0].id
        }
        this.load()
      },
      error: () => this.load(),
    })
  }

  load () {
    this.loading.set(true)
    this.dashboardApi.getOverview(this.selectedCondoId || undefined).subscribe({
      next: (data) => {
        this.overview.set(data)
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
  }

  formatMoney (value: number) {
    const n = Number(value)
    return Number.isFinite(n) ? n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
  }
}

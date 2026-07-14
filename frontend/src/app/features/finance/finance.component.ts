import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSelectModule } from '@angular/material/select'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { FormsModule } from '@angular/forms'

import { FinanceApiService } from '../../core/services/finance-api.service'
import { BillingApiService } from '../../core/services/billing-api.service'
import { CondominiumsApiService } from '../../core/services/condominiums-api.service'
import { EmailApiService } from '../../core/services/email-api.service'
import { NotifyService } from '../../core/services/notify.service'
import type {
  AccountStatement,
  BillingGrid,
  BillingConcept,
  Condominium,
  MaintenanceFee,
  MorosityReport,
  Payment,
  UnitAccountSummary,
} from '../../core/models/domain.models'
import { GenerateFeesDialogComponent, PaymentFormDialogComponent } from './finance-dialogs'
import { PeriodMonthFieldComponent } from '../../shared/components/period-month-field/period-month-field.component'
import { PageHeadingComponent } from '../../shared/components/page-heading/page-heading.component'
import { environment } from '../../../environments/environment'

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    PeriodMonthFieldComponent,
    PageHeadingComponent,
  ],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.scss',
})
export class FinanceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly financeApi = inject(FinanceApiService)
  private readonly billingApi = inject(BillingApiService)
  private readonly condosApi = inject(CondominiumsApiService)
  private readonly emailApi = inject(EmailApiService)
  private readonly dialog = inject(MatDialog)
  private readonly notify = inject(NotifyService)

  readonly loading = signal(true)
  readonly condominiums = signal<Condominium[]>([])
  selectedCondoId = ''
  selectedUnitId = ''

  readonly fees = signal<MaintenanceFee[]>([])
  readonly payments = signal<Payment[]>([])
  readonly morosity = signal<MorosityReport | null>(null)
  readonly morosityLoading = signal(false)
  readonly statement = signal<AccountStatement | null>(null)
  readonly statementSummaries = signal<UnitAccountSummary[]>([])
  readonly statementSummariesLoading = signal(false)
  readonly statementDetailLoading = signal(false)
  statementSearch = ''
  private statementSearchTimer?: ReturnType<typeof setTimeout>
  readonly billingGrid = signal<BillingGrid | null>(null)
  readonly gridLoading = signal(false)
  readonly gridSaving = signal(false)
  readonly selectedTabIndex = signal(0)

  billingPeriod = this.currentPeriod()
  readonly poolDraft = signal<Record<string, number>>({})
  readonly cellDraft = signal<Record<string, number>>({})

  feeCols = ['unit', 'period', 'amount', 'paid', 'status', 'pay']
  paymentCols = ['date', 'unit', 'amount', 'method', 'reference', 'receipt']
  statementCols = ['unitCode', 'owner', 'phone', 'email', 'paidMonths', 'status', 'actions']
  morosityCols = ['unit', 'owner', 'phone', 'email', 'period', 'morAmount', 'morPaid', 'morBalance', 'morDueDate', 'morStatus']
  readonly serverUrl = environment.serverUrl

  ngOnInit () {
    this.syncTabFromRoute()
    this.condosApi.list({ limit: 100 }).subscribe({
      next: (r) => {
        this.condominiums.set(r.data)
        if (r.data.length) {
          this.selectedCondoId = r.data[0].id
          this.loadFees()
          this.loadActiveTabData()
        }
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
    this.loadPayments()
  }

  private syncTabFromRoute () {
    const tabIndex = Number(this.route.snapshot.data['tabIndex'] ?? 0)
    this.selectedTabIndex.set(tabIndex)
  }

  onCondoChange () {
    this.loadFees()
    this.morosity.set(null)
    this.selectedUnitId = ''
    this.statement.set(null)
    this.statementSummaries.set([])
    this.loadActiveTabData()
  }

  private loadActiveTabData () {
    const index = this.selectedTabIndex()
    if (index === 1) this.loadBillingGrid()
    if (index === 3) this.loadMorosity()
    if (index === 4) this.loadStatementSummaries()
  }

  loadFees () {
    if (!this.selectedCondoId) return
    this.financeApi.listFees({ condominiumId: this.selectedCondoId, limit: 200 }).subscribe({
      next: (r) => this.fees.set(r.data),
    })
  }

  loadPayments () {
    this.financeApi.listPayments({ limit: 50 }).subscribe({
      next: (r) => this.payments.set(r.data),
    })
  }

  statusClass (s: string) {
    if (s === 'PAID') return 'badge badge--green'
    if (s === 'OVERDUE') return 'badge badge--red'
    if (s === 'PARTIAL') return 'badge badge--orange'
    return 'badge badge--gray'
  }

  openGenerateFees () {
    const ref = this.dialog.open(GenerateFeesDialogComponent, {
      width: '440px',
      data: { condominiums: this.condominiums() },
    })
    ref.afterClosed().subscribe((v) => {
      if (!v) return
      this.financeApi.generateFees(v).subscribe({
        next: (r) => {
          this.notify.success(`${r.created} cuotas generadas`)
          this.loadFees()
        },
        error: () => this.notify.error('Error al generar cuotas'),
      })
    })
  }

  openPayment () {
    if (!this.selectedCondoId) {
      this.notify.error('Selecciona un condominio')
      return
    }
    const ref = this.dialog.open(PaymentFormDialogComponent, {
      width: '620px',
      maxWidth: '96vw',
      data: { condominiumId: this.selectedCondoId },
    })
    ref.afterClosed().subscribe((v) => {
      if (!v) return
      this.financeApi.registerPayment(v).subscribe({
        next: () => {
          this.notify.success('Pago registrado')
          this.loadFees()
          this.loadPayments()
          if (this.selectedTabIndex() === 3) this.loadMorosity()
        },
        error: (err) => {
          const msg = err?.error?.message?.message ?? err?.error?.message
          this.notify.error(typeof msg === 'string' ? msg : 'Error al registrar pago')
        },
      })
    })
  }

  payFee (fee: MaintenanceFee) {
    if (!this.selectedCondoId) return
    const ref = this.dialog.open(PaymentFormDialogComponent, {
      width: '620px',
      maxWidth: '96vw',
      data: {
        condominiumId: this.selectedCondoId,
        preselectedUnitId: fee.unitId,
        preselectedFeeId: fee.id,
      },
    })
    ref.afterClosed().subscribe((v) => {
      if (!v) return
      this.financeApi.registerPayment(v).subscribe({
        next: () => {
          this.notify.success('Pago registrado')
          this.loadFees()
          this.loadPayments()
          if (this.selectedTabIndex() === 3) this.loadMorosity()
        },
        error: (err) => {
          const msg = err?.error?.message?.message ?? err?.error?.message
          this.notify.error(typeof msg === 'string' ? msg : 'Error al registrar pago')
        },
      })
    })
  }

  loadMorosity () {
    if (!this.selectedCondoId) return
    this.morosityLoading.set(true)
    this.financeApi.getMorosity(this.selectedCondoId).subscribe({
      next: (r) => {
        this.morosity.set(this.normalizeMorosityReport(r))
        this.morosityLoading.set(false)
      },
      error: () => {
        this.notify.error('Error al cargar morosidad')
        this.morosityLoading.set(false)
      },
    })
  }

  morosityStatusLabel (status: string) {
    const map: Record<string, string> = {
      PAID: 'Pagado',
      PENDING: 'Pendiente',
      PARTIAL: 'Parcial',
      OVERDUE: 'Vencido',
    }
    return map[status] ?? status
  }

  formatMorosityDate (value: string | null | undefined) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  private normalizeMorosityReport (report: MorosityReport): MorosityReport {
    const items = (report.items ?? []).map((item) => {
      const amount = this.coerceMoney(item.amount)
      const paid = this.coerceMoney(item.paid)
      const balance = this.coerceMoney(item.balance ?? amount - paid)
      return { ...item, amount, paid, balance }
    })
    const totalDebt = this.coerceMoney(
      report.totalDebt ?? items.reduce((sum, item) => sum + item.balance, 0),
    )
    return {
      ...report,
      total: items.length,
      totalDebt,
      items,
    }
  }

  private coerceMoney (value: unknown) {
    if (value == null || value === '') return 0
    const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
  }

  loadStatementSummaries () {
    if (!this.selectedCondoId) return
    this.statementSummariesLoading.set(true)
    this.financeApi.listAccountSummaries(this.selectedCondoId, {
      search: this.statementSearch.trim(),
      limit: 100,
    }).subscribe({
      next: (r) => {
        this.statementSummaries.set(r.data)
        this.statementSummariesLoading.set(false)
      },
      error: () => {
        this.notify.error('Error al cargar estados de cuenta')
        this.statementSummariesLoading.set(false)
      },
    })
  }

  onStatementSearch () {
    clearTimeout(this.statementSearchTimer)
    this.statementSearchTimer = setTimeout(() => this.loadStatementSummaries(), 300)
  }

  viewStatement (row: UnitAccountSummary) {
    this.selectedUnitId = row.unitId
    this.statementDetailLoading.set(true)
    this.financeApi.getStatement(row.unitId).subscribe({
      next: (s) => {
        this.statement.set(s)
        this.statementDetailLoading.set(false)
      },
      error: () => {
        this.notify.error('Error al cargar detalle')
        this.statementDetailLoading.set(false)
      },
    })
  }

  downloadStatementPdf (unitId?: string, mode: 'latest' | 'history' = 'latest') {
    const id = unitId ?? this.selectedUnitId
    if (!id) return
    this.financeApi.getStatementPdf(id, mode).subscribe({
      next: (r) => window.open(`${environment.serverUrl}${r.fileUrl}`, '_blank'),
      error: () => this.notify.error('Error al generar PDF'),
    })
  }

  statementStatusClass (row: UnitAccountSummary) {
    return row.hasMorosity ? 'badge badge--red' : 'badge badge--green'
  }

  pendingDebtsLabel (row: UnitAccountSummary) {
    if (!row.pendingDebts.length) return ''
    return row.pendingDebts
      .map((d) => `${d.periodLabel}: S/ ${d.balance.toFixed(2)}`)
      .join(' · ')
  }

  formatPaidPeriodsDetail (periods?: AccountStatement['paidPeriods']) {
    if (!periods?.length) return '—'
    return periods.map((p) => `${p.label} (S/ ${p.amount.toFixed(2)})`).join(' · ')
  }

  onTab (ev: MatTabChangeEvent) {
    this.selectedTabIndex.set(ev.index)
    if (ev.index === 1) {
      this.loadBillingGrid()
      void this.router.navigate(['/finance/grid'])
    } else if (ev.index === 0) {
      void this.router.navigate(['/finance'])
    } else {
      this.loadActiveTabData()
    }
  }

  currentPeriod () {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  cellKey (unitId: string, conceptId: string) {
    return `${unitId}:${conceptId}`
  }

  getCellAmount (unitId: string, conceptId: string, fallback: number) {
    const cells = this.cellDraft()
    return cells[this.cellKey(unitId, conceptId)] ?? fallback
  }

  poolAmount (concept: BillingConcept) {
    const pools = this.poolDraft()
    return pools[concept.id] ?? concept.poolAmount ?? 0
  }

  setPoolAmount (conceptId: string, raw: string | number) {
    const value = typeof raw === 'number' ? raw : parseFloat(String(raw)) || 0
    this.poolDraft.update((p) => ({ ...p, [conceptId]: value }))
  }

  onCellInput (unitId: string, conceptId: string, value: string | number) {
    const amount = typeof value === 'number' ? value : parseFloat(String(value)) || 0
    this.cellDraft.update((cells) => ({
      ...cells,
      [this.cellKey(unitId, conceptId)]: amount,
    }))
  }

  isConceptFixed (concept: BillingConcept) {
    return concept.type === 'FIXED'
  }

  formatMoney (value: number) {
    const n = Number(value)
    return Number.isFinite(n) ? n.toFixed(2) : '0.00'
  }

  billingUnitCount (grid: BillingGrid) {
    const owned = grid.rows.filter((r) => r.ownerName && r.ownerName !== '—').length
    return owned || grid.rows.length || 1
  }

  toggleConceptType (concept: BillingConcept, fixed: boolean) {
    const grid = this.billingGrid()
    if (!grid || grid.sheet.status === 'PUBLISHED') return

    const type: 'FIXED' | 'VARIABLE' = fixed ? 'FIXED' : 'VARIABLE'
    if (concept.type === type) return

    this.billingApi.updateConceptType(concept.id, type).subscribe({
      next: () => {
        this.billingGrid.update((g) => {
          if (!g) return g
          return {
            ...g,
            concepts: g.concepts.map((c) => (c.id === concept.id ? { ...c, type } : c)),
          }
        })
        if (type === 'VARIABLE') {
          this.poolDraft.update((p) => {
            const next = { ...p }
            delete next[concept.id]
            return next
          })
        }
        this.notify.success(`"${concept.name}" ahora es ${fixed ? 'fijo' : 'variable'}`)
      },
      error: () => this.notify.error('No se pudo cambiar el tipo de concepto'),
    })
  }

  loadBillingGrid () {
    if (!this.selectedCondoId || !this.billingPeriod) return
    this.gridLoading.set(true)
    this.billingApi.getGrid(this.selectedCondoId, this.billingPeriod).subscribe({
      next: (grid) => {
        this.billingGrid.set(grid)
        const pools: Record<string, number> = { ...grid.sheet.fixedPools }
        for (const c of grid.concepts) {
          if (c.type === 'FIXED' && pools[c.id] === undefined) {
            pools[c.id] = c.poolAmount ?? 0
          }
        }
        this.poolDraft.set(pools)
        this.cellDraft.set({})
        this.gridLoading.set(false)
      },
      error: () => {
        this.notify.error('Error al cargar cuadro de cobros')
        this.gridLoading.set(false)
      },
    })
  }

  saveBillingGrid () {
    const grid = this.billingGrid()
    if (!grid || grid.sheet.status === 'PUBLISHED') return

    this.gridSaving.set(true)
    const variableLines = grid.rows.flatMap((row) =>
      grid.concepts
        .filter((c) => c.type === 'VARIABLE')
        .map((c) => ({
          unitId: row.unitId,
          chargeConceptId: c.id,
          amount: this.getCellAmount(row.unitId, c.id, row.cells[c.id]?.amount ?? 0),
          isManualOverride: true,
        })),
    )

    this.billingApi.updateSheet(grid.sheet.id, { fixedPools: this.poolDraft() }).subscribe({
      next: () => {
        this.billingApi.updateLines(grid.sheet.id, variableLines).subscribe({
          next: () => {
            this.billingApi.recalculate(grid.sheet.id).subscribe({
              next: () => {
                this.notify.success('Cuadro guardado y conceptos fijos repartidos')
                this.gridSaving.set(false)
                this.loadBillingGrid()
              },
              error: () => {
                this.notify.error('Error al repartir conceptos fijos')
                this.gridSaving.set(false)
              },
            })
          },
          error: () => {
            this.notify.error('Error al guardar montos variables')
            this.gridSaving.set(false)
          },
        })
      },
      error: () => {
        this.notify.error('Error al guardar cuadro')
        this.gridSaving.set(false)
      },
    })
  }

  rowTotal (grid: BillingGrid, unitId: string) {
    this.poolDraft()
    this.cellDraft()
    const row = grid.rows.find((r) => r.unitId === unitId)
    if (!row) return 0
    const unitCount = this.billingUnitCount(grid)
    return grid.concepts.reduce((sum, c) => {
      if (c.type === 'VARIABLE') {
        return sum + this.getCellAmount(unitId, c.id, row.cells[c.id]?.amount ?? 0)
      }
      return sum + this.fixedPerUnit(grid, c)
    }, 0)
  }

  fixedPerUnit (grid: BillingGrid, concept: BillingConcept) {
    const pools = this.poolDraft()
    const unitCount = this.billingUnitCount(grid)
    const pool = pools[concept.id] ?? concept.poolAmount ?? 0
    if (!unitCount) return 0
    return Math.round((pool / unitCount) * 100) / 100
  }

  publishBillingGrid () {
    const grid = this.billingGrid()
    if (!grid || grid.sheet.status === 'PUBLISHED') return

    this.gridSaving.set(true)
    const variableLines = grid.rows.flatMap((row) =>
      grid.concepts
        .filter((c) => c.type === 'VARIABLE')
        .map((c) => ({
          unitId: row.unitId,
          chargeConceptId: c.id,
          amount: this.getCellAmount(row.unitId, c.id, row.cells[c.id]?.amount ?? 0),
          isManualOverride: true,
        })),
    )

    this.billingApi.updateSheet(grid.sheet.id, { fixedPools: this.poolDraft() }).subscribe({
      next: () => {
        this.billingApi.updateLines(grid.sheet.id, variableLines).subscribe({
          next: () => {
            this.billingApi.recalculate(grid.sheet.id).subscribe({
              next: () => {
                this.billingApi.publish(grid.sheet.id, grid.sheet.dueDate ?? undefined).subscribe({
                  next: (r) => {
                    this.notify.success(`${r.fees} cuotas publicadas · Total S/ ${r.totalAmount.toFixed(2)}`)
                    this.gridSaving.set(false)
                    this.loadBillingGrid()
                    this.loadFees()
                  },
                  error: () => {
                    this.notify.error('Error al publicar cuotas')
                    this.gridSaving.set(false)
                  },
                })
              },
              error: () => {
                this.notify.error('Error al repartir conceptos fijos')
                this.gridSaving.set(false)
              },
            })
          },
          error: () => {
            this.notify.error('Error al guardar montos variables')
            this.gridSaving.set(false)
          },
        })
      },
      error: () => {
        this.notify.error('Error al guardar cuadro')
        this.gridSaving.set(false)
      },
    })
  }

  columnTotalLive (grid: BillingGrid, conceptId: string) {
    this.poolDraft()
    this.cellDraft()
    const concept = grid.concepts.find((c) => c.id === conceptId)
    if (!concept) return 0
    if (concept.type === 'FIXED') {
      return this.poolAmount(concept)
    }
    return grid.rows.reduce(
      (s, r) => s + this.getCellAmount(r.unitId, conceptId, r.cells[conceptId]?.amount ?? 0),
      0,
    )
  }

  grandTotalLive (grid: BillingGrid) {
    this.poolDraft()
    this.cellDraft()
    return grid.rows.reduce((s, r) => s + this.rowTotal(grid, r.unitId), 0)
  }

  sendStatementsEmail (onlyMorosity = true) {
    if (!this.selectedCondoId) return
    this.emailApi.sendStatements(this.selectedCondoId, onlyMorosity).subscribe({
      next: (r) => this.notify.success(`${r.queued} correos encolados (job Bull)`),
      error: () => this.notify.error('Error — verifique SMTP en .env'),
    })
  }

  runCronNow () {
    this.emailApi.runMorosityCronNow().subscribe({
      next: () => this.notify.success('Cron de morosidad ejecutado — revisa cola de emails'),
      error: () => this.notify.error('Error al ejecutar cron'),
    })
  }
}

import { Injectable, inject } from '@angular/core'

import { ApiService } from './api.service'

export interface ReportRow {
  id: string
  kind: 'INCOME' | 'EXPENSE'
  date: string
  label: string
  category: string
  amount: number
  reference?: string
  vendor?: string
  fromMaintenance?: boolean
}

export interface IncomeExpenseReport {
  summary: {
    totalIncome: number
    totalExpense: number
    balance: number
    incomeCount: number
    expenseCount: number
  }
  income: ReportRow[]
  expenses: ReportRow[]
  expensesByCategory: { category: string; amount: number }[]
}

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly api = inject(ApiService)

  incomeExpense (params?: { condominiumId?: string; from?: string; to?: string }) {
    return this.api.get<IncomeExpenseReport>('/reports/income-expense', params)
  }
}

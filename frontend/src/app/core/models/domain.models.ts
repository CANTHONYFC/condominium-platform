export interface PaginatedMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage?: boolean
  hasPreviousPage?: boolean
}

export interface Paginated<T> {
  data: T[]
  meta: PaginatedMeta
}

export interface Condominium {
  id: string
  code: string
  name: string
  address?: string
  city?: string
  country?: string
  totalUnits: number
  isActive: boolean
}

export interface Tower {
  id: string
  code: string
  name: string
  floorsCount: number
}

export interface Floor {
  id: string
  number: number
  name?: string
  towerId?: string
  blockId?: string
  tower?: Tower
  _count?: { units: number }
}

export interface Unit {
  id: string
  code: string
  type: 'APARTMENT' | 'PARKING' | 'STORAGE'
  area?: number
  bedrooms?: number
  bathrooms?: number
  occupancyStatus: 'OCCUPIED' | 'VACANT' | 'UNDER_MAINTENANCE'
  maintenanceFee: number | string
  floorId?: string
  floor?: Floor & { tower?: Tower }
  ownerships?: UnitOwnership[]
  residents?: unknown[]
}

export interface UnitOwnership {
  id: string
  sharePercent: number | string
  isPrimary: boolean
  unit?: Unit
  owner?: Owner
}

export interface Owner {
  id: string
  type: 'NATURAL' | 'LEGAL'
  documentType: string
  documentNumber: string
  firstName?: string
  lastName?: string
  legalName?: string
  email?: string
  phone?: string
  address?: string
  status: string
  ownerships?: UnitOwnership[]
  history?: OwnerHistory[]
  documents?: EntityDocument[]
}

export interface OwnerHistory {
  id: string
  event: string
  notes?: string
  createdAt: string
}

export interface EntityDocument {
  id: string
  category: string
  title: string
  fileUrl: string
  createdAt: string
}

export interface MaintenanceFee {
  id: string
  period: string
  amount: number | string
  paidAmount: number | string
  status: string
  dueDate: string
  unitId: string
  unit?: { id: string; code: string }
  payments?: Payment[]
}

export interface Payment {
  id: string
  amount: number | string
  method: string
  reference?: string
  attachmentUrl?: string
  paymentDate: string
  maintenanceFee?: MaintenanceFee & { unit?: { code: string } }
}

export interface AccountStatement {
  unit: { id: string; code: string; condominiumId: string }
  owner?: {
    id: string
    name: string
    phone: string | null
    email: string | null
  } | null
  summary: {
    totalCharged: number
    totalPaid: number
    balance: number
    pendingFees: number
  }
  paidPeriods?: Array<{ period: string; label: string; amount: number }>
  pendingDebts?: Array<{
    period: string
    label: string
    amount: number
    paidAmount: number
    balance: number
    status: string
    dueDate: string
  }>
  fees: Array<{
    id: string
    period: string
    amount: number
    paidAmount: number
    balance: number
    status: string
    dueDate: string
    concepts?: Array<{
      code: string
      name: string
      type: string
      amount: number
    }>
  }>
}

export interface UnitPendingFees {
  unit: { id: string; code: string }
  owner: { name: string; phone: string | null; email: string | null } | null
  totalDebt: number
  items: Array<{
    id: string
    period: string
    periodLabel: string
    amount: number
    paid: number
    balance: number
    dueDate: string
    status: string
  }>
}

export interface UnitAccountSummary {
  unitId: string
  unitCode: string
  owner: {
    id: string
    name: string
    phone: string | null
    email: string | null
  } | null
  paidPeriods: string[]
  paidPeriodsLabel: string
  pendingDebts: Array<{
    period: string
    periodLabel: string
    amount: number
    paidAmount: number
    balance: number
    status: string
    dueDate: string
  }>
  totalDebt: number
  hasMorosity: boolean
  status: 'AL_DIA' | 'MORA'
  statusLabel: string
}

export interface BillingConcept {
  id: string
  code: string
  name: string
  type: 'FIXED' | 'VARIABLE'
  sortOrder: number
  poolAmount: number | null
}

export interface BillingGridRow {
  unitId: string
  unitCode: string
  ownerName: string
  cells: Record<string, { lineId: string; amount: number; isManualOverride: boolean }>
  total: number
}

export interface BillingGrid {
  sheet: {
    id: string
    period: string
    label: string | null
    dueDate: string | null
    status: 'DRAFT' | 'PUBLISHED'
    fixedPools: Record<string, number>
  }
  concepts: BillingConcept[]
  rows: BillingGridRow[]
  columnTotals: Record<string, number>
  grandTotal: number
}

export interface MorosityReport {
  total: number
  totalDebt: number
  items: Array<{
    unitId: string
    unitCode: string
    ownerName: string
    ownerPhone: string | null
    ownerEmail: string | null
    period: string
    periodLabel: string
    amount: number
    paid: number
    balance: number
    dueDate: string
    status: string
  }>
}

export interface CommonArea {
  id: string
  code: string
  name: string
  description?: string
  capacity?: number
  maxReservationHours?: number
  condominiumId?: string
  schedules?: CommonAreaSchedule[]
  blocks?: CommonAreaBlock[]
}

export interface CommonAreaSchedule {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotMinutes: number
}

export interface CommonAreaBlock {
  id: string
  startAt: string
  endAt: string
  reason?: string
}

export interface ReservationBookedBy {
  name: string | null
  email: string | null
  phone: string | null
  unitCode: string | null
  role: string | null
}

export interface Reservation {
  id: string
  condominiumId: string
  commonAreaId: string
  unitId?: string
  startAt: string
  endAt: string
  status: string
  notes?: string
  commonArea?: { id: string; code: string; name: string; condominiumId?: string }
  bookedBy?: ReservationBookedBy
}

export interface AvailabilitySlot {
  startAt: string
  endAt: string
  available: boolean
  unavailableReason?: 'RESERVED' | 'ADMIN_BLOCK' | 'MAINTENANCE'
}

export interface Expense {
  id: string
  condominiumId?: string
  calendarEventId?: string | null
  category: string
  amount: number | string
  description?: string
  vendor?: string
  receiptNumber?: string
  attachmentUrl?: string
  transactionDate: string
}

export interface MaintenanceEvent {
  id: string
  condominiumId?: string
  commonAreaId?: string | null
  commonArea?: Pick<CommonArea, 'id' | 'code' | 'name'>
  title: string
  description?: string
  startAt: string
  endAt: string
  allDay: boolean
  type: string
  vendor?: string
  cost?: number | string
  attachmentUrl?: string
  status: string
}

export interface UploadResult {
  fileUrl: string
  fileSize: number
  mimeType: string
  filename: string
}

export interface EmailJob {
  id: string
  type: string
  recipientEmail: string
  subject: string
  status: string
  error?: string
  sentAt?: string
  createdAt: string
}

export interface DashboardOverview {
  morosity: number
  morosityDebt: number
  income: number
  incomeMonth: number
  expenses: number
  expensesMonth: number
  netMonth: number
  collectionRate: number
  openIncidents: number
  openTickets: number
  reservations: number
  occupancyRate: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  todayVisits: number
  activeStaff: number
  monthlyFinance: Array<{
    period: string
    label: string
    income: number
    expenses: number
  }>
  morosityByUnit: Array<{
    unitCode: string
    ownerName: string
    balance: number
    pendingCount: number
  }>
  feeStatus: {
    pending: number
    partial: number
    overdue: number
    paid: number
    cancelled: number
  }
  updatedAt: string
}

export const EXPENSE_CATEGORY_SERVICE = 'servicio'

export const EXPENSE_CATEGORIES = [
  { value: EXPENSE_CATEGORY_SERVICE, label: 'Servicio' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'suministros', label: 'Suministros' },
  { value: 'personal', label: 'Personal' },
  { value: 'administracion', label: 'Administración' },
  { value: 'otros', label: 'Otros' },
] as const

export function expenseCategoryLabel (value: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

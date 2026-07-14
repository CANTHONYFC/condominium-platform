import type { Owner, Unit } from '../../core/models/domain.models'

/** Formato: Torre A · Piso 2 · Dpto. 101 (condominio) o Dpto. D-001 (edificio simple) */
export function formatUnitLocation (unit?: Unit | null, condoLabel?: string): string {
  if (!unit) return '—'

  const parts: string[] = []
  if (condoLabel) parts.push(condoLabel)

  const tower = unit.floor?.tower
  const floor = unit.floor

  if (tower?.name || tower?.code) {
    parts.push(`Torre ${tower.name || tower.code}`)
  }
  if (floor?.number != null) {
    parts.push(`Piso ${floor.number}`)
  }

  parts.push(`Dpto. ${unit.code}`)
  return parts.join(' · ')
}

export function formatOwnerName (owner?: Owner | null): string {
  if (!owner) return '—'
  if (owner.type === 'LEGAL') return owner.legalName?.trim() || '—'
  return `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || '—'
}

export function formatUnitWithOwner (unit: Unit): string {
  const owner = unit.ownerships?.[0]?.owner
  const name = formatOwnerName(owner)
  return name === '—' ? unit.code : `${unit.code} — ${name}`
}

export function formatOwnerLocations (owner: {
  ownerships?: Array<{ unit?: Unit | null; isPrimary?: boolean }>
}, condoLabel?: string): string {
  const list = owner.ownerships?.filter((o) => o.unit) ?? []
  if (!list.length) return 'Sin asignar'
  const primary = list.find((o) => o.isPrimary) ?? list[0]
  if (list.length === 1) {
    return formatUnitLocation(primary.unit, condoLabel)
  }
  return `${formatUnitLocation(primary.unit, condoLabel)} (+${list.length - 1})`
}

export function periodFromDate (d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function dateToIsoDate (d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parsePeriodToDate (period: string): Date {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, (m || 1) - 1, 1)
}

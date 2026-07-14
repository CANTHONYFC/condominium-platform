import type { Floor } from '../../../core/models/domain.models'

export const DEFAULT_UNIT_CODE_PREFIX = 'D'

export function normalizeUnitCodePrefix (prefix?: string): string {
  const p = (prefix ?? DEFAULT_UNIT_CODE_PREFIX).trim().toUpperCase()
  return /^[A-Z]{1,4}$/.test(p) ? p : DEFAULT_UNIT_CODE_PREFIX
}

export function formatUnitCode (prefix: string, sequence: number): string {
  return `${normalizeUnitCodePrefix(prefix)}-${String(sequence).padStart(3, '0')}`
}

export interface FloorCodePreview {
  label: string
  codes: string[]
}

export function previewBuildingFull (
  floorsCount: number,
  unitsPerFloor: number,
  prefix: string,
  startSequence = 1,
): FloorCodePreview[] {
  const rows: FloorCodePreview[] = []
  let counter = startSequence

  for (let floorNumber = 1; floorNumber <= floorsCount; floorNumber++) {
    const codes: string[] = []
    for (let index = 0; index < unitsPerFloor; index++) {
      codes.push(formatUnitCode(prefix, counter))
      counter += 1
    }
    rows.push({ label: `Piso ${floorNumber}`, codes })
  }

  return rows
}

export function previewBuildingOnExistingFloors (
  floors: Floor[],
  unitsPerFloor: number,
  prefix: string,
  startSequence = 1,
): FloorCodePreview[] {
  const sorted = [...floors].sort((a, b) => a.number - b.number)
  let counter = startSequence

  return sorted.map((floor) => {
    const codes: string[] = []
    for (let index = 0; index < unitsPerFloor; index++) {
      codes.push(formatUnitCode(prefix, counter))
      counter += 1
    }
    const label = floor.name ? `Piso ${floor.number} (${floor.name})` : `Piso ${floor.number}`
    return { label, codes }
  })
}

export function previewCondominiumFull (
  towersCount: number,
  floorsPerTower: number,
  unitsPerFloor: number,
  prefix = DEFAULT_UNIT_CODE_PREFIX,
): FloorCodePreview[] {
  const rows: FloorCodePreview[] = []
  let counter = 1

  for (let towerIndex = 1; towerIndex <= towersCount; towerIndex++) {
    for (let floorNumber = 1; floorNumber <= floorsPerTower; floorNumber++) {
      const codes: string[] = []
      for (let index = 0; index < unitsPerFloor; index++) {
        codes.push(formatUnitCode(prefix, counter))
        counter += 1
      }
      rows.push({ label: `Torre ${towerIndex} — Piso ${floorNumber}`, codes })
    }
  }

  return rows
}

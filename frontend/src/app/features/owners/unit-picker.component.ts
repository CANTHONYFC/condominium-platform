import { Component, computed, effect, inject, input, model, signal } from '@angular/core'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatTabsModule } from '@angular/material/tabs'

import { StructureApiService } from '../../core/services/structure-api.service'
import type { Unit } from '../../core/models/domain.models'

interface UnitFloorGroup {
  key: string
  tabLabel: string
  floorNumber: number
  units: Unit[]
}

@Component({
  selector: 'app-unit-picker',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatTabsModule],
  template: `
    @if (loading()) {
      <div class="picker-loading"><mat-spinner diameter="28"></mat-spinner></div>
    } @else if (!groups().length) {
      <p class="picker-empty">No hay departamentos disponibles. Genera la estructura primero.</p>
    } @else {
      <div class="picker-legend">
        <span><i class="dot dot--vacant"></i> Disponible</span>
        <span><i class="dot dot--selected"></i> Seleccionado</span>
        <span class="picker-legend__count">{{ units().length }} disponibles</span>
      </div>

      <mat-tab-group
        class="floor-tabs"
        [selectedIndex]="activeTabIndex()"
        (selectedIndexChange)="activeTabIndex.set($event)"
        animationDuration="150ms"
      >
        @for (group of groups(); track group.key) {
          <mat-tab>
            <ng-template mat-tab-label>
              <span class="tab-label">{{ group.tabLabel }}</span>
              <span class="tab-badge">{{ group.units.length }}</span>
            </ng-template>
            <div class="picker-panel">
              <p class="picker-panel__hint">
                {{ group.units.length }} departamento{{ group.units.length === 1 ? '' : 's' }} disponible{{ group.units.length === 1 ? '' : 's' }} en este piso
              </p>
              <div class="picker-row__seats">
                @for (unit of group.units; track unit.id) {
                  <button
                    type="button"
                    class="seat"
                    [class.seat--selected]="unitId() === unit.id"
                    (click)="selectUnit(unit.id)"
                  >
                    {{ unit.code }}
                  </button>
                }
              </div>
            </div>
          </mat-tab>
        }
      </mat-tab-group>
    }
  `,
  styleUrl: './unit-picker.component.scss',
})
export class UnitPickerComponent {
  private readonly structureApi = inject(StructureApiService)

  readonly condominiumId = input.required<string>()
  readonly mode = input<'BUILDING' | 'CONDOMINIUM'>('BUILDING')
  readonly unitId = model<string | null>(null)

  readonly loading = signal(false)
  readonly units = signal<Unit[]>([])
  readonly activeTabIndex = signal(0)

  readonly groups = computed(() => this.groupUnits(this.units(), this.mode()))

  constructor () {
    effect(() => {
      const condoId = this.condominiumId()
      if (!condoId) return
      this.loading.set(true)
      this.activeTabIndex.set(0)
      this.structureApi.listAvailableUnits(condoId).subscribe({
        next: (items) => {
          this.units.set(items)
          this.loading.set(false)
          if (items.length && !this.unitId()) {
            this.unitId.set(items[0].id)
          }
          this.syncActiveTab()
        },
        error: () => {
          this.units.set([])
          this.loading.set(false)
        },
      })
    })

    effect(() => {
      this.unitId()
      this.syncActiveTab()
    })
  }

  selectUnit (id: string) {
    this.unitId.set(id)
  }

  private syncActiveTab () {
    const selected = this.unitId()
    if (!selected) return
    const index = this.groups().findIndex((group) => group.units.some((unit) => unit.id === selected))
    if (index >= 0) this.activeTabIndex.set(index)
  }

  private groupUnits (units: Unit[], mode: 'BUILDING' | 'CONDOMINIUM'): UnitFloorGroup[] {
    const map = new Map<string, UnitFloorGroup>()

    for (const unit of units) {
      const floor = unit.floor
      const towerName = floor?.tower?.name
      const floorNumber = floor?.number ?? 0
      const key = mode === 'CONDOMINIUM' && towerName
        ? `${towerName}-${floorNumber}`
        : String(floorNumber)
      const baseLabel = floor?.name && floor.name !== `Piso ${floorNumber}`
        ? `Piso ${floorNumber} · ${floor.name}`
        : `Piso ${floorNumber}`
      const tabLabel = mode === 'CONDOMINIUM' && towerName
        ? `${towerName} · Piso ${floorNumber}`
        : baseLabel

      const group = map.get(key) ?? { key, tabLabel, floorNumber, units: [] }
      group.units.push(unit)
      map.set(key, group)
    }

    return [...map.values()]
      .sort((a, b) => a.floorNumber - b.floorNumber)
      .map((group) => ({
        ...group,
        units: group.units.sort((a, b) => a.code.localeCompare(b.code, 'es')),
      }))
  }
}

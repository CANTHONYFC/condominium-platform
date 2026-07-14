import { Component, computed, inject, OnInit, signal } from '@angular/core'

import { ActivatedRoute, RouterLink } from '@angular/router'

import { MatCardModule } from '@angular/material/card'

import { MatTabsModule } from '@angular/material/tabs'

import { MatTableModule } from '@angular/material/table'

import { MatButtonModule } from '@angular/material/button'

import { MatIconModule } from '@angular/material/icon'

import { MatDialog } from '@angular/material/dialog'

import { MatMenuModule } from '@angular/material/menu'

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'



import { StructureApiService } from '../../../core/services/structure-api.service'

import { CondominiumsApiService } from '../../../core/services/condominiums-api.service'

import { AuthService } from '../../../core/services/auth.service'

import { NotifyService } from '../../../core/services/notify.service'

import type { Condominium, Floor, Owner, Tower, Unit } from '../../../core/models/domain.models'

import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component'

import {

  FloorFormDialogComponent,

  StructureGeneratorDialogComponent,

  TowerFormDialogComponent,

  UnitFormDialogComponent,

} from './structure-dialogs'

import { PageHeadingComponent } from '../../../shared/components/page-heading/page-heading.component'
import { formatOwnerName } from '../../../shared/utils/unit-location'



@Component({

  selector: 'app-structure',

  standalone: true,

  imports: [

    RouterLink,

    MatCardModule,

    MatTabsModule,

    MatTableModule,

    MatButtonModule,

    MatIconModule,

    MatMenuModule,

    MatProgressSpinnerModule,

    PageHeadingComponent,

  ],

  templateUrl: './structure.component.html',

  styleUrl: './structure.component.scss',

})

export class StructureComponent implements OnInit {

  private readonly route = inject(ActivatedRoute)

  private readonly structureApi = inject(StructureApiService)

  private readonly condosApi = inject(CondominiumsApiService)

  private readonly auth = inject(AuthService)

  private readonly dialog = inject(MatDialog)

  private readonly notify = inject(NotifyService)



  condoId = ''

  readonly loading = signal(true)

  readonly condo = signal<Condominium | null>(null)

  readonly towers = signal<Tower[]>([])

  readonly floors = signal<Floor[]>([])

  readonly units = signal<Unit[]>([])

  readonly structureMode = signal<'BUILDING' | 'CONDOMINIUM'>('CONDOMINIUM')

  readonly unitCodePrefix = signal('D')



  readonly isBuildingMode = computed(() => this.structureMode() === 'BUILDING')

  readonly hasStructure = computed(() =>

    this.towers().length > 0 || this.floors().length > 0 || this.units().length > 0,

  )

  readonly needsDepartmentGeneration = computed(() =>

    this.floors().length > 0 && this.units().length === 0,

  )

  readonly vacantUnits = computed(() =>

    this.units().filter((u) => u.occupancyStatus === 'VACANT').length,

  )

  readonly occupiedUnits = computed(() =>

    this.units().filter((u) => u.occupancyStatus === 'OCCUPIED').length,

  )

  readonly floorCols = computed(() =>

    this.isBuildingMode()

      ? ['number', 'name', 'units', 'actions']

      : ['number', 'name', 'tower', 'units', 'actions'],

  )

  readonly unitsByFloorId = computed(() => {

    const map = new Map<string, string[]>()

    for (const unit of this.units()) {

      if (!unit.floorId) continue

      const codes = map.get(unit.floorId) ?? []

      codes.push(unit.code)

      map.set(unit.floorId, codes)

    }

    for (const [floorId, codes] of map) {

      map.set(floorId, codes.sort())

    }

    return map

  })



  towerCols = ['code', 'name', 'floors', 'actions']

  unitCols = ['code', 'type', 'floor', 'fee', 'status', 'owner', 'email', 'phone', 'actions']



  ngOnInit () {

    this.condoId = this.route.snapshot.paramMap.get('id')!

    this.loadAll()

  }



  loadAll () {

    this.loading.set(true)

    this.condosApi.get(this.condoId).subscribe({

      next: (c) => this.condo.set(c),

      error: () => this.notify.error('Edificio o condominio no encontrado'),

    })

    this.structureApi.getStructureMode(this.condoId).subscribe({

      next: (m) => {

        this.structureMode.set(m.mode)

        if (m.unitCodePrefix) this.unitCodePrefix.set(m.unitCodePrefix)

      },

      error: () => this.inferStructureModeFromTenant(),

    })

    this.structureApi.listTowers(this.condoId).subscribe((r) => this.towers.set(r.data))

    this.structureApi.listFloors(this.condoId).subscribe((r) => this.floors.set(r.data))

    this.structureApi.listUnits(this.condoId).subscribe({

      next: (r) => {

        this.units.set(r.data)

        this.loading.set(false)

      },

      error: () => {

        this.notify.error('No se pudieron cargar los departamentos')

        this.loading.set(false)

      },

    })

  }



  private inferStructureModeFromTenant () {

    const org = this.auth.currentTenant()?.organizationType

    this.structureMode.set(org === 'BUILDING' ? 'BUILDING' : 'CONDOMINIUM')

  }



  unitTypeLabel (t: string) {

    return ({ APARTMENT: 'Depto', PARKING: 'Cochera', STORAGE: 'Depósito' } as Record<string, string>)[t] ?? t

  }



  statusLabel (s: string) {

    return ({ VACANT: 'Vacante', OCCUPIED: 'Ocupado', UNDER_MAINTENANCE: 'Mantenimiento' } as Record<string, string>)[s] ?? s

  }

  unitOwner (unit: Unit): Owner | undefined {
    const list = unit.ownerships ?? []
    return (list.find((o) => o.isPrimary) ?? list[0])?.owner
  }

  ownerName (unit: Unit) {
    return formatOwnerName(this.unitOwner(unit))
  }

  ownerEmail (unit: Unit) {
    return this.unitOwner(unit)?.email?.trim() || '—'
  }

  ownerPhone (unit: Unit) {
    return this.unitOwner(unit)?.phone?.trim() || '—'
  }



  floorUnitSummary (floor: Floor): string {

    const codes = this.unitsByFloorId().get(floor.id) ?? []

    if (codes.length) return codes.join(', ')

    return '—'

  }



  generatorButtonLabel (): string {

    if (this.needsDepartmentGeneration()) {

      return this.isBuildingMode() ? 'Generar departamentos' : 'Generar domicilios'

    }

    return 'Generar estructura'

  }



  openGenerator () {

    const ref = this.dialog.open(StructureGeneratorDialogComponent, {

      width: '540px',

      maxHeight: '90vh',

      data: {

        mode: this.structureMode(),

        hasExisting: this.hasStructure(),

        generationScope: this.needsDepartmentGeneration() ? 'UNITS_ONLY' : 'FULL',

        floors: this.floors(),

        unitCodePrefix: this.unitCodePrefix(),

      },

    })

    ref.afterClosed().subscribe((result) => {

      if (!result) return

      if (result.type === 'UNITS_ONLY') {

        this.structureApi.generateDepartmentUnits(this.condoId, result.payload as {

          unitsPerFloor: number

          replaceExisting?: boolean

          unitCodePrefix?: string

        }).subscribe({

          next: (res) => {

            this.notify.success(

              `${res.unitsCreated} ${this.isBuildingMode() ? 'departamentos' : 'domicilios'} creados (${res.firstCode} … ${res.lastCode})`,

            )

            this.loadAll()

          },

          error: (err) => this.showGeneratorError(err, 'departamentos'),

        })

        return

      }

      this.structureApi.generateStructure(this.condoId, result.payload).subscribe({

        next: (res) => {

          const unitLabel = this.isBuildingMode() ? 'departamentos' : 'domicilios'

          const towersPart = res.towersCreated > 0 ? `${res.towersCreated} torres, ` : ''

          this.notify.success(

            `Estructura creada: ${towersPart}${res.floorsCreated} pisos, ${res.unitsCreated} ${unitLabel}`,

          )

          this.loadAll()

        },

        error: (err) => this.showGeneratorError(err, 'estructura'),

      })

    })

  }



  private showGeneratorError (err: { error?: { message?: string | string[] } }, fallback: string) {

    const msg = err?.error?.message

    this.notify.error(Array.isArray(msg) ? msg[0] : msg ?? `Error al generar ${fallback}`)

  }



  // Towers

  addTower () {

    const ref = this.dialog.open(TowerFormDialogComponent, { width: '420px', data: {} })

    ref.afterClosed().subscribe((v) => {

      if (!v) return

      this.structureApi.createTower(this.condoId, v).subscribe({

        next: () => { this.notify.success('Torre creada'); this.loadAll() },

        error: () => this.notify.error('Error al crear torre'),

      })

    })

  }



  editTower (item: Tower) {

    const ref = this.dialog.open(TowerFormDialogComponent, { width: '420px', data: { item } })

    ref.afterClosed().subscribe((v) => {

      if (!v) return

      this.structureApi.updateTower(this.condoId, item.id, v).subscribe({

        next: () => { this.notify.success('Torre actualizada'); this.loadAll() },

        error: () => this.notify.error('Error al actualizar'),

      })

    })

  }



  deleteTower (item: Tower) {

    this.confirmDelete(`torre "${item.name}"`, () =>

      this.structureApi.deleteTower(this.condoId, item.id),

    )

  }



  // Floors

  addFloor () {

    const ref = this.dialog.open(FloorFormDialogComponent, {

      width: '420px',

      data: { towers: this.towers() },

    })

    ref.afterClosed().subscribe((v) => {

      if (!v) return

      this.structureApi.createFloor(this.condoId, v).subscribe({

        next: () => { this.notify.success('Piso creado'); this.loadAll() },

        error: () => this.notify.error('Error al crear piso'),

      })

    })

  }



  editFloor (item: Floor) {

    const ref = this.dialog.open(FloorFormDialogComponent, {

      width: '420px',

      data: { item, towers: this.towers() },

    })

    ref.afterClosed().subscribe((v) => {

      if (!v) return

      this.structureApi.updateFloor(this.condoId, item.id, v).subscribe({

        next: () => { this.notify.success('Piso actualizado'); this.loadAll() },

        error: () => this.notify.error('Error al actualizar'),

      })

    })

  }



  deleteFloor (item: Floor) {

    this.confirmDelete(`piso ${item.number}`, () =>

      this.structureApi.deleteFloor(this.condoId, item.id),

    )

  }



  // Units

  addUnit (floor?: Floor) {

    const ref = this.dialog.open(UnitFormDialogComponent, {

      width: '460px',

      data: {
        floors: this.floors(),
        defaultFloorId: floor?.id ?? null,
        unitCodePrefix: this.unitCodePrefix(),
      },

    })

    ref.afterClosed().subscribe((v) => {

      if (!v) return

      this.structureApi.createUnit(this.condoId, v).subscribe({

        next: () => { this.notify.success('Unidad creada'); this.loadAll() },

        error: () => this.notify.error('Error al crear unidad'),

      })

    })

  }



  editUnit (item: Unit) {

    const ref = this.dialog.open(UnitFormDialogComponent, {

      width: '460px',

      data: { item, floors: this.floors() },

    })

    ref.afterClosed().subscribe((v) => {

      if (!v) return

      this.structureApi.updateUnit(this.condoId, item.id, v).subscribe({

        next: () => { this.notify.success('Unidad actualizada'); this.loadAll() },

        error: () => this.notify.error('Error al actualizar'),

      })

    })

  }



  deleteUnit (item: Unit) {

    this.confirmDelete(`unidad "${item.code}"`, () =>

      this.structureApi.deleteUnit(this.condoId, item.id),

    )

  }



  private confirmDelete (label: string, action: () => ReturnType<StructureApiService['deleteTower']>) {

    const ref = this.dialog.open(ConfirmDialogComponent, {

      data: { title: 'Confirmar eliminación', message: `¿Eliminar ${label}?`, confirmLabel: 'Eliminar', danger: true },

    })

    ref.afterClosed().subscribe((ok) => {

      if (!ok) return

      action().subscribe({

        next: () => { this.notify.success('Eliminado'); this.loadAll() },

        error: () => this.notify.error('No se pudo eliminar'),

      })

    })

  }

}



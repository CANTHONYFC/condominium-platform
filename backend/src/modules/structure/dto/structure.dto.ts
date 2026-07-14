import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator'

export class CreateTowerDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  floorsCount?: number
}

export class UpdateTowerDto extends PartialType(CreateTowerDto) {}

export class CreateBlockDto {
  @ApiProperty()
  @IsString()
  name: string
}

export class UpdateBlockDto extends PartialType(CreateBlockDto) {}

export class CreateFloorDto {
  @ApiProperty()
  @IsInt()
  number: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  towerId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blockId?: string
}

export class UpdateFloorDto extends PartialType(CreateFloorDto) {}

export class CreateUnitDto {
  @ApiProperty({ enum: ['APARTMENT', 'PARKING', 'STORAGE'] })
  @IsString()
  type: 'APARTMENT' | 'PARKING' | 'STORAGE'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floorId?: string

  @ApiPropertyOptional()
  @IsOptional()
  area?: number

  @ApiPropertyOptional()
  @IsOptional()
  bedrooms?: number

  @ApiPropertyOptional()
  @IsOptional()
  bathrooms?: number

  @ApiPropertyOptional()
  @IsOptional()
  maintenanceFee?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateUnitDto extends PartialType(CreateUnitDto) {
  @ApiPropertyOptional({ enum: ['OCCUPIED', 'VACANT', 'UNDER_MAINTENANCE'] })
  @IsOptional()
  @IsString()
  occupancyStatus?: 'OCCUPIED' | 'VACANT' | 'UNDER_MAINTENANCE'
}

export class GenerateStructureDto {
  @ApiPropertyOptional({ description: 'Elimina torres, pisos y unidades existentes antes de generar' })
  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean

  @ApiPropertyOptional({ description: 'Edificio: cantidad de pisos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  floorsCount?: number

  @ApiPropertyOptional({ description: 'Departamentos o domicilios por piso' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  unitsPerFloor?: number

  @ApiPropertyOptional({ description: 'Condominio: cantidad de torres' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  towersCount?: number

  @ApiPropertyOptional({ description: 'Condominio: pisos por torre' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  floorsPerTower?: number

  @ApiPropertyOptional({ description: 'Edificio: prefijo de código de departamento (ej. D, L)' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{1,4}$/)
  unitCodePrefix?: string
}

export class GenerateDepartmentUnitsDto {
  @ApiProperty({ description: 'Departamentos o domicilios por cada piso existente' })
  @IsInt()
  @Min(1)
  @Max(50)
  unitsPerFloor: number

  @ApiPropertyOptional({ description: 'Elimina departamentos actuales antes de generar' })
  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean

  @ApiPropertyOptional({ description: 'Edificio: prefijo de código de departamento (ej. D, L)' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{1,4}$/)
  unitCodePrefix?: string
}

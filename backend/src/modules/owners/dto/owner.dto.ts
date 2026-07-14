import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator'

export class CreateOwnerDto {
  @ApiProperty({ enum: ['NATURAL', 'LEGAL'] })
  @IsEnum(['NATURAL', 'LEGAL'])
  type: 'NATURAL' | 'LEGAL'

  @ApiProperty()
  @IsString()
  documentType: string

  @ApiProperty()
  @IsString()
  documentNumber: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ description: 'Departamento o domicilio a asignar al crear' })
  @IsOptional()
  @IsString()
  unitId?: string

  @ApiPropertyOptional({ description: 'Contraseña del portal (login con el email)' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string

  @ApiPropertyOptional({ description: 'Crear usuario con rol propietario', default: true })
  @IsOptional()
  @IsBoolean()
  createPortalAccess?: boolean
}

export class UpdateOwnerDto extends PartialType(CreateOwnerDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string
}

export class AssignOwnershipDto {
  @ApiProperty()
  @IsString()
  unitId: string

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sharePercent?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ description: 'Contraseña del portal al asignar primera unidad' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string
}

export class CreateOwnerHistoryDto {
  @ApiProperty()
  @IsString()
  event: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}

export class CreateOwnerDocumentDto {
  @ApiProperty()
  @IsString()
  category: string

  @ApiProperty()
  @IsString()
  title: string

  @ApiProperty()
  @IsString()
  fileUrl: string

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  fileSize?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string
}

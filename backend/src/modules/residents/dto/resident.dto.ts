import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator'

export class CreateResidentDto {
  @ApiProperty()
  @IsString()
  unitId: string

  @ApiProperty({ enum: ['OWNER', 'FAMILY', 'TENANT'] })
  @IsEnum(['OWNER', 'FAMILY', 'TENANT'])
  type: 'OWNER' | 'FAMILY' | 'TENANT'

  @ApiProperty()
  @IsString()
  firstName: string

  @ApiProperty()
  @IsString()
  lastName: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentType?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentNumber?: string

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
  @IsDateString()
  moveInDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean

  @ApiPropertyOptional({ description: 'Crear cuenta de usuario para portal residente' })
  @IsOptional()
  @IsBoolean()
  createUserAccount?: boolean

  @ApiPropertyOptional({ description: 'Contraseña inicial (requerida si createUserAccount)' })
  @IsOptional()
  @IsString()
  password?: string
}

export class UpdateResidentDto extends PartialType(CreateResidentDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  moveOutDate?: string
}

export class CreateResidentHistoryDto {
  @ApiProperty()
  @IsString()
  event: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}

export class CreateResidentDocumentDto {
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

export class CreatePetDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty()
  @IsString()
  species: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  breed?: string
}

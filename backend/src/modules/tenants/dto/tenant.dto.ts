import { PartialType, OmitType } from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'

import { OrganizationType } from '../../../../generated/prisma'

export class CreateTenantAdminDto {
  @ApiProperty()
  @IsString()
  firstName: string

  @ApiProperty()
  @IsString()
  lastName: string

  @ApiProperty({ description: 'Correo con el que ingresará al panel' })
  @IsEmail()
  email: string

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string
}

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string

  @ApiProperty({ description: 'Email de contacto de la empresa' })
  @IsEmail()
  email: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ enum: OrganizationType })
  @IsOptional()
  @IsEnum(OrganizationType)
  organizationType?: OrganizationType

  @ApiPropertyOptional({ description: 'Cupo máximo de usuarios/empleados' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number

  @ApiProperty({ type: CreateTenantAdminDto })
  @ValidateNested()
  @Type(() => CreateTenantAdminDto)
  admin: CreateTenantAdminDto
}

export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, ['admin'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

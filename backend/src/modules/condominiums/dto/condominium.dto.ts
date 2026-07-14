import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'

import { PropertyType } from '../../../../generated/prisma'

export class CreateCondominiumDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number
}

export class UpdateCondominiumDto extends PartialType(CreateCondominiumDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

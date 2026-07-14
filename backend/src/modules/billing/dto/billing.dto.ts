import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator'
import { ChargeConceptType } from '../../../../generated/prisma'

export class BillingGridQueryDto {
  @ApiProperty()
  @IsUUID()
  condominiumId: string

  @ApiProperty({ example: '2026-06' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  period: string
}

export class UpdateBillingSheetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional({ description: 'Totales fijos por conceptId' })
  @IsOptional()
  @IsObject()
  fixedPools?: Record<string, number>
}

export class ChargeLineUpdateDto {
  @ApiProperty()
  @IsUUID()
  unitId: string

  @ApiProperty()
  @IsUUID()
  chargeConceptId: string

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number

  @ApiPropertyOptional()
  @IsOptional()
  isManualOverride?: boolean
}

export class UpdateChargeLinesDto {
  @ApiProperty({ type: [ChargeLineUpdateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChargeLineUpdateDto)
  lines: ChargeLineUpdateDto[]
}

export class UpdateChargeConceptDto {
  @ApiProperty({ enum: ChargeConceptType })
  @IsEnum(ChargeConceptType)
  type: ChargeConceptType
}

export class PublishBillingSheetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string
}

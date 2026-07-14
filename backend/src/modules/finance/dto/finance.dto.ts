import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

export class CreateMaintenanceFeeDto {
  @ApiProperty()
  @IsString()
  unitId: string

  @ApiProperty({ example: '2026-06' })
  @IsString()
  period: string

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number

  @ApiProperty()
  @IsDateString()
  dueDate: string
}

export class GenerateFeesDto {
  @ApiProperty()
  @IsString()
  condominiumId: string

  @ApiProperty({ example: '2026-06' })
  @IsString()
  period: string

  @ApiProperty()
  @IsDateString()
  dueDate: string
}

export class CreatePaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maintenanceFeeId?: string

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number

  @ApiProperty({ example: 'TRANSFER' })
  @IsString()
  method: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ description: 'URL del comprobante de pago (foto/PDF)' })
  @IsOptional()
  @IsString()
  attachmentUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string
}

export class AccountStatementQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromPeriod?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toPeriod?: string

  @ApiPropertyOptional({ enum: ['latest', 'history'], description: 'latest = último mes, history = todos los meses' })
  @IsOptional()
  @IsIn(['latest', 'history'])
  mode?: 'latest' | 'history'
}

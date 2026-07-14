import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator'

export enum ExportModuleEnum {
  OWNERS = 'owners',
  RESIDENTS = 'residents',
  UNITS = 'units',
  MAINTENANCE_FEES = 'maintenance-fees',
  MOROSITY = 'morosity',
  PAYMENTS = 'payments',
}

export enum ExportFormatEnum {
  EXCEL = 'EXCEL',
  PDF = 'PDF',
}

export class CreateExportDto {
  @ApiProperty({ enum: ExportModuleEnum })
  @IsEnum(ExportModuleEnum)
  module: ExportModuleEnum

  @ApiProperty({ enum: ExportFormatEnum })
  @IsEnum(ExportFormatEnum)
  format: ExportFormatEnum

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>
}

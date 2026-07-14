import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsUUID } from 'class-validator'

export class IncomeExpenseReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  condominiumId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string
}

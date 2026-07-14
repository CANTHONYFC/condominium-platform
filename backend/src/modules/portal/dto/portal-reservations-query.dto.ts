import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

import { PaginationQueryDto } from '../../../common/dto/pagination.dto'

export class PortalReservationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ default: 100, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  override limit?: number = 100

  @ApiPropertyOptional({ description: 'Fecha inicio ISO para filtrar reservas' })
  @IsOptional()
  @IsString()
  from?: string

  @ApiPropertyOptional({ description: 'Fecha fin ISO para filtrar reservas' })
  @IsOptional()
  @IsString()
  to?: string
}

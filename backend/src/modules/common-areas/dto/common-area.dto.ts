import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateCommonAreaDto {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  maxReservationHours?: number
}

export class UpdateCommonAreaDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  maxReservationHours?: number
}

export class UpsertScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number

  @IsString()
  startTime: string

  @IsString()
  endTime: string

  @IsOptional()
  @IsInt()
  @Min(15)
  slotMinutes?: number
}

export class CreateBlockDto {
  @IsString()
  startAt: string

  @IsString()
  endAt: string

  @IsOptional()
  @IsString()
  reason?: string
}

export class UpdateBlockDto {
  @IsOptional()
  @IsString()
  startAt?: string

  @IsOptional()
  @IsString()
  endAt?: string

  @IsOptional()
  @IsString()
  reason?: string
}

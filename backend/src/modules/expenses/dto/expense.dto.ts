import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateExpenseDto {
  @IsString()
  condominiumId: string

  @IsString()
  category: string

  @IsNumber()
  @Min(0.01)
  amount: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  vendor?: string

  @IsOptional()
  @IsString()
  receiptNumber?: string

  @IsOptional()
  @IsString()
  attachmentUrl?: string

  @IsOptional()
  @IsString()
  transactionDate?: string
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  vendor?: string

  @IsOptional()
  @IsString()
  receiptNumber?: string

  @IsOptional()
  @IsString()
  attachmentUrl?: string

  @IsOptional()
  @IsString()
  transactionDate?: string
}

import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OpenCashRegisterDto {
  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  initialAmount: number;
}

export class CloseCashRegisterDto {
  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  actualAmount: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}


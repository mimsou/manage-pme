import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RecordPaymentDto {
  @ApiProperty({ description: 'Montant du règlement' })
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  amount: number;
}

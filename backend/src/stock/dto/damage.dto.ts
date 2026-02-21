import { IsString, IsInt, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';

export class CreateDamageDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ 
    enum: ['DAMAGE', 'LOSS'], 
    description: 'Type: DAMAGE (casse) ou LOSS (perte)' 
  })
  @IsEnum(StockMovementType)
  type: 'DAMAGE' | 'LOSS';

  @ApiProperty({ description: 'Quantité positive pour ajouter, négative pour retirer' })
  @IsInt()
  quantity: number;

  @ApiProperty({ required: true })
  @IsString()
  reason: string;
}


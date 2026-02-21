import { IsString, IsOptional, IsArray, ValidateNested, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRefundItemDto {
  @ApiProperty({ description: 'ID de la ligne de vente (SaleItem)' })
  @IsUUID()
  saleItemId: string;

  @ApiProperty({ description: 'Quantité à rembourser (avoir)' })
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateRefundDto {
  @ApiProperty({ type: [CreateRefundItemDto], description: 'Lignes à inclure dans l\'avoir' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRefundItemDto)
  items: CreateRefundItemDto[];

  @ApiProperty({ required: false, description: 'Motif de l\'avoir (ex: retour marchandise)' })
  @IsString()
  @IsOptional()
  reason?: string;
}

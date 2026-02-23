import { IsArray, IsOptional, ValidateNested, Min, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/** Quantité à facturer par ligne de devis (optionnel). Si absent = quantités complètes. */
class QuoteItemQuantityDto {
  @ApiProperty({ description: 'ID de la ligne du devis (quoteItemId)' })
  @IsUUID()
  quoteItemId: string;

  @ApiProperty({ description: 'Quantité à inclure dans la facture (1 à quantité commandée)' })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  quantity: number;
}

export class ConvertToSaleDto {
  @ApiProperty({
    required: false,
    type: [QuoteItemQuantityDto],
    description: 'Quantités par ligne. Si absent, toutes les lignes sont converties avec la quantité commandée.',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemQuantityDto)
  quantities?: QuoteItemQuantityDto[];
}

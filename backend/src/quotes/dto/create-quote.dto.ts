import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class QuoteItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  quantity: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  discount?: number;
}

export class CreateQuoteDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ type: [QuoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  discount?: number;

  @ApiProperty({ required: false, description: 'Date de validité du devis (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  validUntil?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false, description: 'Code devise (ex: TND, EUR)' })
  @IsString()
  @IsOptional()
  currencyCode?: string;
}

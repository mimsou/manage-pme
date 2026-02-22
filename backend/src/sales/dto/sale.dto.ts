import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsIn,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SaleType, PaymentMethod } from '@prisma/client';

/** Valeurs acceptées pour paymentMethod (liste explicite pour inclure CREDIT). */
const PAYMENT_METHOD_VALUES = ['CASH', 'CARD', 'MIXED', 'CREDIT', 'OTHER'] as const;

class SaleItemDto {
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

export class CreateSaleDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  cashRegisterId?: string;

  @ApiProperty({ enum: SaleType, default: SaleType.TICKET })
  @IsEnum(SaleType)
  type: SaleType;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  discount?: number;

  @ApiProperty({ enum: [...PAYMENT_METHOD_VALUES], description: 'CASH, CARD, MIXED, CREDIT (facture impayée), OTHER' })
  @IsIn([...PAYMENT_METHOD_VALUES], { message: `paymentMethod must be one of: ${PAYMENT_METHOD_VALUES.join(', ')}` })
  paymentMethod: PaymentMethod;

  @ApiProperty({ required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  cashAmount?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  cardAmount?: number;

  @ApiProperty({ required: false, description: 'Échéance (facture). Si absent, facture = +30j.' })
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ required: false, description: 'Code devise de la facture (ex: TND, EUR). Si absent, utilise la devise par défaut.' })
  @IsString()
  @IsOptional()
  currencyCode?: string;
}


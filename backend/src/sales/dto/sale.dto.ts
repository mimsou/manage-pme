import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SaleType, PaymentMethod } from '@prisma/client';

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

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
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
}


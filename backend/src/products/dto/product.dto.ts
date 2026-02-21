import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  purchasePrice: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  salePrice: number;

  @ApiProperty({ required: false, description: 'Unité de vente (ex: pièce, kg, m, L)' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  stockMin?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  stockCurrent?: number;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  hasVariants?: boolean;
}

export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  purchasePrice?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  salePrice?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  @Min(0)
  stockMin?: number;

  @ApiProperty({ required: false, description: 'Unité de vente (ex: pièce, kg, m, L)' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  priceChangeReason?: string;
}


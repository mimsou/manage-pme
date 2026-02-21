import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VariantAttributeDto {
  @ApiProperty()
  @IsString()
  type: string; // "color", "size", etc.

  @ApiProperty()
  @IsString()
  value: string; // "NOIR", "M", etc.
}

export class CreateVariantDto {
  @ApiProperty({ type: [VariantAttributeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  attributes: VariantAttributeDto[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  stockCurrent: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  stockMin: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  barcode?: string;
}

export class CreateProductWithVariantsDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty({ required: false, description: 'Unité de vente (ex: pièce, kg, m, L)' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ type: [CreateVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}


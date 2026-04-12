import { IsString, IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class AddInventoryItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  /** Si le produit a des variantes, obligatoire pour compter au niveau SKU */
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  productVariantId?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  countedQty: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateInventoryItemDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  countedQty: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}

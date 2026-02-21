import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

  @ApiProperty()
  @IsInt()
  countedQty: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}


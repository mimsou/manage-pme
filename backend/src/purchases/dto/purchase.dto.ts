import { IsString, IsOptional, IsArray, ValidateNested, IsInt, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseStatus } from '@prisma/client';

export class CreatePurchaseItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreatePurchaseDto {
  @ApiProperty()
  @IsString()
  supplierId: string;

  @ApiProperty()
  @IsString()
  reference: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  deliveryDate?: string;

  @ApiProperty({ type: [CreatePurchaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdatePurchaseDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  deliveryDate?: string;

  @ApiProperty({ enum: PurchaseStatus, required: false })
  @IsEnum(PurchaseStatus)
  @IsOptional()
  status?: PurchaseStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReceivePurchaseItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  receivedQuantity: number;
}

export class ReceivePurchaseDto {
  @ApiProperty({ type: [ReceivePurchaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseItemDto)
  items: ReceivePurchaseItemDto[];

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  deliveryDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}



import { IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutCartDto {
  @ApiProperty()
  @IsString()
  addressId!: string;

  @ApiProperty()
  @IsBoolean()
  acceptPriceChanges!: boolean;
}

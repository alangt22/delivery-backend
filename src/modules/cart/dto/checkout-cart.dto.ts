import { IsBoolean, IsString } from 'class-validator';

export class CheckoutCartDto {
  @IsString()
  addressId!: string;

  @IsBoolean()
  acceptPriceChanges!: boolean;
}
import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { ProductsModule } from '../products/products.module';
import { AddressesModule } from '../addresses/addresses.module';


@Module({
  providers: [CartService],
  controllers: [CartController],
  imports: [ ProductsModule, AddressesModule],
  exports: [CartService]
})
export class CartModule {}

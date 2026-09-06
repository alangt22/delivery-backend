import { Module } from '@nestjs/common';

import { OrdersController } from './order.controller';
import { OrdersService } from './order.service';

import { AddressesModule } from '../addresses/addresses.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { CartModule } from '../cart/cart.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    AddressesModule,
    RestaurantsModule,
    CartModule,
    PaymentsModule,
  ],
})
export class OrdersModule {}
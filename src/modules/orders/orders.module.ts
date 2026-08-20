import { Module } from '@nestjs/common';
import { OrdersController } from './order.controller';
import { OrdersService } from './order.service';
import { AddressesModule } from '../addresses/addresses.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { CartModule } from '../cart/cart.module';

@Module({
    controllers: [OrdersController],
    providers: [OrdersService],
    imports: [
        AddressesModule , 
        RestaurantsModule,
        CartModule
    ],
})
export class OrdersModule {}

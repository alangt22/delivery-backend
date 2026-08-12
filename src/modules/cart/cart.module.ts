import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { ProductsModule } from '../products/products.module';


@Module({
  providers: [CartService],
  controllers: [CartController],
  imports: [ ProductsModule],
})
export class CartModule {}

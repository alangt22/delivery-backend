import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  controllers: [RestaurantsController],
  providers: [RestaurantsService, RolesGuard],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
import { Module } from '@nestjs/common';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
    imports: [RestaurantsModule],
    controllers: [CategoriesController],
    providers: [CategoriesService],
    exports: [CategoriesService],
})
export class CategoriesModule {}

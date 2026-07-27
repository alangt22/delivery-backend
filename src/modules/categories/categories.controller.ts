import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Param,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('restaurants/:restaurantId/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('restaurantId') restaurantId: string,
    @Req() req,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(dto, restaurantId, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Param('restaurantId') restaurantId: string, @Req() req) {
    return this.categoriesService.findAllByRestaurant(
      restaurantId,
      req.user.id,
    );
  }

  @Get(':categoryId')
  @UseGuards(JwtAuthGuard)
  findById(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Req() req,
  ) {
    return this.categoriesService.findById(
      categoryId,
      restaurantId,
      req.user.id,
    );
  }

  @Patch(':categoryId')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Req() req,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(
      categoryId,
      restaurantId,
      req.user.id,
      dto,
    );
  }

  @Delete(':categoryId')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Req() req,
  ) {
    return this.categoriesService.remove(categoryId, restaurantId, req.user.id);
  }

}

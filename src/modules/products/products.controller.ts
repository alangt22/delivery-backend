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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-prodctdto';

@Controller('restaurants/:restaurantId/categories/:categoryId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Req() req,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(
      dto,
      categoryId,
      restaurantId,
      req.user.id,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Req() req,
  ) {
    return this.productsService.findAll(
      categoryId,
      restaurantId,
      req.user.id,
    );
  }
  

  @Get(':productId')
  @UseGuards(JwtAuthGuard)
  findById(
    @Param('productId') productId: string,
    @Param('categoryId') categoryId: string,
    @Param('restaurantId') restaurantId: string,
    @Req() req,
  ) {
    return this.productsService.findById(
      productId,
      categoryId,
      restaurantId,
      req.user.id,
    );
  }


  @Patch(':productId')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('productId') productId: string,
    @Param('categoryId') categoryId: string,
    @Param('restaurantId') restaurantId: string,
    @Req() req,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(
      productId,
      categoryId,
      restaurantId,
      req.user.id,
      dto,
    );
  }


  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  delete(
    @Param('productId') productId: string,
    @Param('categoryId') categoryId: string,    
    @Param('restaurantId') restaurantId: string,
    @Req() req,
  ) {
    return this.productsService.remove(
      productId,
      categoryId,
      restaurantId,
      req.user.id,
    );
  }
}

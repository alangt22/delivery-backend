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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-prodctdto';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';


@Controller('restaurants/:restaurantId/categories/:categoryId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'Hambúrguer Clássico',
        },
        description: {
          type: 'string',
          example: 'Hambúrguer com queijo e molho especial',
        },
        price: {
          type: 'number',
          example: 29.9,
        },
        image: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['name', 'price'],
    },
  })
  create(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Req() req,
    @Body() dto: CreateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.create(
      dto,
      categoryId,
      restaurantId,
      req.user.id,
      file,
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

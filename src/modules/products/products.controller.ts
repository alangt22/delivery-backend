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

import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-prodctdto';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('restaurants/:restaurantId/categories/:categoryId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Criar produto',
    description:
      'Cria um produto dentro de uma categoria e permite enviar uma imagem.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'ID da categoria',
    example: 'category-123',
  })
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
  @ApiResponse({
    status: 201,
    description: 'Produto criado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados enviados são inválidos ou categoria inválida.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria ou restaurante não encontrado.',
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

  @Get('public')
  @ApiOperation({
    summary: 'Listar produtos públicos',
    description:
      'Retorna apenas os produtos disponíveis de uma categoria de um restaurante aprovado.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'ID da categoria',
    example: 'category-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Produtos públicos retornados com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria ou restaurante não encontrado.',
  })
  findPublicAll(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.productsService.findPublicAll(
      restaurantId,
      categoryId,
    );
  }

  @Get('public/:productId')
  @ApiOperation({
    summary: 'Buscar produto público',
    description:
      'Retorna um produto disponível de uma categoria de um restaurante aprovado.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'ID da categoria',
    example: 'category-123',
  })
  @ApiParam({
    name: 'productId',
    description: 'ID do produto',
    example: 'product-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Produto público retornado com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto, categoria ou restaurante não encontrado.',
  })
  findPublicById(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Param('productId') productId: string,
  ) {
    return this.productsService.findPublicById(
      productId,
      restaurantId,
      categoryId,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar produtos da categoria',
    description:
      'Retorna todos os produtos pertencentes à categoria informada.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'ID da categoria',
    example: 'category-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Produtos retornados com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria ou restaurante não encontrado.',
  })
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
  @ApiOperation({
    summary: 'Buscar produto por ID',
    description: 'Retorna um produto específico da categoria.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'ID da categoria',
    example: 'category-123',
  })
  @ApiParam({
    name: 'productId',
    description: 'ID do produto',
    example: 'product-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Produto encontrado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto, categoria ou restaurante não encontrado.',
  })
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
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Atualizar produto',
    description:
      'Atualiza os dados do produto e permite substituir sua imagem.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'ID da categoria',
    example: 'category-123',
  })
  @ApiParam({
    name: 'productId',
    description: 'ID do produto',
    example: 'product-123',
  })
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
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Produto atualizado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados enviados são inválidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto, categoria ou restaurante não encontrado.',
  })
  update(
    @Param('productId') productId: string,
    @Param('categoryId') categoryId: string,
    @Param('restaurantId') restaurantId: string,
    @Req() req,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.productsService.update(
      productId,
      categoryId,
      restaurantId,
      req.user.id,
      dto,
      file,
    );
  }

  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Remover produto',
    description: 'Remove um produto da categoria.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'ID da categoria',
    example: 'category-123',
  })
  @ApiParam({
    name: 'productId',
    description: 'ID do produto',
    example: 'product-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Produto removido com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto, categoria ou restaurante não encontrado.',
  })
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
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

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('restaurants/:restaurantId/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Criar categoria',
    description: 'Cria uma nova categoria dentro de um restaurante.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiResponse({
    status: 201,
    description: 'Categoria criada com sucesso.',
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
    description: 'Restaurante não encontrado.',
  })
  create(
    @Param('restaurantId') restaurantId: string,
    @Req() req,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(dto, restaurantId, req.user.id);
  }

  @Get('public')
  @ApiOperation({
    summary: 'Listar categorias públicas',
    description:
      'Retorna as categorias de um restaurante aprovado para os consumidores.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Categorias públicas retornadas com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurante não encontrado ou não aprovado.',
  })
  findPublicAll(@Param('restaurantId') restaurantId: string) {
    return this.categoriesService.findPublicAllByRestaurant(restaurantId);
  }

  @Get('public/:categoryId')
  @ApiOperation({
    summary: 'Buscar categoria pública',
    description:
      'Retorna uma categoria específica de um restaurante aprovado.',
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
    description: 'Categoria pública retornada com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria ou restaurante não encontrado.',
  })
  findPublicById(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.findPublicById(
      categoryId,
      restaurantId,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar categorias do restaurante',
    description:
      'Retorna todas as categorias pertencentes ao restaurante informado.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Categorias retornadas com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurante não encontrado.',
  })
  findAll(@Param('restaurantId') restaurantId: string, @Req() req) {
    return this.categoriesService.findAllByRestaurant(
      restaurantId,
      req.user.id,
    );
  }

  @Get(':categoryId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Buscar categoria por ID',
    description: 'Retorna uma categoria específica do restaurante.',
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
    description: 'Categoria encontrada com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria ou restaurante não encontrado.',
  })
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
  @ApiOperation({
    summary: 'Atualizar categoria',
    description: 'Atualiza os dados de uma categoria existente.',
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
    description: 'Categoria atualizada com sucesso.',
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
    description: 'Categoria ou restaurante não encontrado.',
  })
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
  @ApiOperation({
    summary: 'Remover categoria',
    description: 'Remove uma categoria do restaurante.',
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
    description: 'Categoria removida com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria ou restaurante não encontrado.',
  })
  remove(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Req() req,
  ) {
    return this.categoriesService.remove(
      categoryId,
      restaurantId,
      req.user.id,
    );
  }
}
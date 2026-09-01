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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@ApiTags('Restaurants')
@ApiBearerAuth()
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Criar restaurante',
    description: 'Cria um novo restaurante para o usuário autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Restaurante criado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados enviados são inválidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  create(@Req() req, @Body() dto: CreateRestaurantDto) {
    return this.restaurantsService.create(dto, req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar meus restaurantes',
    description:
      'Retorna todos os restaurantes pertencentes ao usuário autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de restaurantes retornada com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  findAll(@Req() req) {
    return this.restaurantsService.findAllByOwner(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Buscar restaurante por ID',
    description:
      'Retorna um restaurante pertencente ao usuário autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Restaurante encontrado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurante não encontrado.',
  })
  findById(@Param('id') id: string, @Req() req) {
    return this.restaurantsService.findById(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  @ApiOperation({
    summary: 'Atualizar restaurante',
    description:
      'Atualiza os dados do restaurante e permite substituir a logo e o banner.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'Alan Burger',
        },
        description: {
          type: 'string',
          example: 'Hambúrguer artesanal',
        },
        logo: {
          type: 'string',
          format: 'binary',
        },
        banner: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Restaurante atualizado com sucesso.',
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
  update(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateRestaurantDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    },
  ) {
    return this.restaurantsService.update(
      id,
      req.user.id,
      dto,
      files?.logo?.[0],
      files?.banner?.[0],
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Remover restaurante',
    description:
      'Remove um restaurante pertencente ao usuário autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Restaurante removido com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurante não encontrado.',
  })
  delete(@Param('id') id: string, @Req() req) {
    return this.restaurantsService.remove(id, req.user.id);
  }
}
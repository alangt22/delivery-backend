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
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Restaurants')
@ApiBearerAuth()
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
  ) { }

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

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar restaurantes pendentes',
    description:
      'Retorna os restaurantes que aguardam aprovação administrativa.',
  })
  @ApiResponse({
    status: 200,
    description: 'Restaurantes pendentes retornados com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão de administrador.',
  })
  findPending() {
    return this.restaurantsService.findPending();
  }

  @Patch('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Aprovar restaurante',
    description:
      'Aprova um restaurante pendente e o disponibiliza na vitrine pública.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Restaurante aprovado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão de administrador.',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurante não encontrado ou já processado.',
  })
  approve(@Param('id') id: string) {
    return this.restaurantsService.approve(id);
  }

  @Patch('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Rejeitar restaurante',
    description:
      'Rejeita um restaurante pendente e impede sua disponibilização na vitrine pública.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Restaurante rejeitado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão de administrador.',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurante não encontrado ou já processado.',
  })
  reject(@Param('id') id: string) {
    return this.restaurantsService.reject(id);
  }

  @Patch('admin/:id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Suspender restaurante',
    description:
      'Suspende um restaurante aprovado e remove sua disponibilidade na vitrine pública.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Restaurante suspenso com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão de administrador.',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurante não encontrado ou não está aprovado.',
  })
  suspend(@Param('id') id: string) {
    return this.restaurantsService.suspend(id);
  }

  @Patch('admin/:id/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Reativar restaurante',
    description:
      'Reativa um restaurante suspenso e o disponibiliza novamente na vitrine pública.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Restaurante reativado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão de administrador.',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurante não encontrado ou não está suspenso.',
  })
  reactivate(@Param('id') id: string) {
    return this.restaurantsService.reactivate(id);
  }


  @Get()
  @ApiOperation({
    summary: 'Listar restaurantes públicos',
    description:
      'Retorna os restaurantes aprovados disponíveis para os consumidores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Restaurantes públicos retornados com sucesso.',
  })
  findPublicAll() {
    return this.restaurantsService.findPublicAll();
  }

  @Get('public/:id')
  @ApiOperation({
    summary: 'Buscar restaurante público',
    description:
      'Retorna os dados públicos de um restaurante aprovado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Restaurante público retornado com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurante não encontrado.',
  })
  findPublicById(@Param('id') id: string) {
    return this.restaurantsService.findPublicById(id);
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
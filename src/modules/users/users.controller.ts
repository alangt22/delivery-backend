import {
  Controller,
  Get,
  Patch,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Role } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar usuários',
    description:
      'Retorna todos os usuários para gerenciamento administrativo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuários retornados com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não possui permissão de administrador.',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Buscar usuário por ID',
    description:
      'Retorna os dados de um usuário específico para gerenciamento administrativo.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário',
    example: 'user-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário encontrado com sucesso.',
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
    description: 'Usuário não encontrado.',
  })
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('admin/:id/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Bloquear usuário',
    description:
      'Bloqueia um usuário e impede que ele se autentique ou utilize a API.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário que será bloqueado',
    example: 'user-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário bloqueado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuário não possui permissão de administrador ou tentou bloquear a própria conta.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
  })
  block(@Param('id') id: string, @Req() req) {
    return this.usersService.block(id, req.user.id);
  }

  @Patch('admin/:id/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Desbloquear usuário',
    description:
      'Desbloqueia um usuário e permite que ele volte a utilizar a API.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário que será desbloqueado',
    example: 'user-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário desbloqueado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Usuário não possui permissão de administrador ou tentou desbloquear a própria conta.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
  })
  unblock(@Param('id') id: string, @Req() req) {
    return this.usersService.unblock(id, req.user.id);
  }
}
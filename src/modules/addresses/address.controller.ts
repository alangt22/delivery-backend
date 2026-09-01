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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddressesService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Addresses')
@ApiBearerAuth()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Criar endereço',
    description: 'Cria um novo endereço para o usuário autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Endereço criado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados enviados são inválidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  create(@Req() req, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(dto, req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar meus endereços',
    description:
      'Retorna todos os endereços pertencentes ao usuário autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Endereços retornados com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  findAll(@Req() req) {
    return this.addressesService.findAllByUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Buscar endereço por ID',
    description:
      'Retorna um endereço pertencente ao usuário autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do endereço',
    example: 'address-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Endereço encontrado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Endereço não encontrado.',
  })
  findById(@Param('id') id: string, @Req() req) {
    return this.addressesService.findById(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Atualizar endereço',
    description:
      'Atualiza os dados de um endereço pertencente ao usuário autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do endereço',
    example: 'address-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Endereço atualizado com sucesso.',
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
    description: 'Endereço não encontrado.',
  })
  update(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Remover endereço',
    description:
      'Remove um endereço pertencente ao usuário autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do endereço',
    example: 'address-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Endereço removido com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Endereço não encontrado.',
  })
  delete(@Param('id') id: string, @Req() req) {
    return this.addressesService.remove(id, req.user.id);
  }
}
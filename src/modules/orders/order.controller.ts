import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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

import { OrdersService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateOrderStatusDto } from './dto/update-order.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar meus pedidos',
    description:
      'Retorna todos os pedidos realizados pelo usuário autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pedidos retornados com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  async findMyOrders(@Req() req) {
    return this.ordersService.findMyOrders(req.user.id);
  }

  @Get('restaurants/:restaurantId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Listar pedidos do restaurante',
    description:
      'Retorna os pedidos do restaurante pertencente ao usuário autenticado.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Pedidos do restaurante retornados com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurante não encontrado ou não pertence ao usuário.',
  })
  async findMyRestaurantOrders(
    @Param('restaurantId') restaurantId: string,
    @Req() req,
  ) {
    return this.ordersService.findMyRestaurantOrders(
      restaurantId,
      req.user.id,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Buscar meu pedido por ID',
    description:
      'Retorna os detalhes de um pedido pertencente ao usuário autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido',
    example: 'order-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Pedido encontrado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Pedido não encontrado.',
  })
  async findMyOrderById(
    @Param('id') id: string,
    @Req() req,
  ) {
    return this.ordersService.findMyOrderById(id, req.user.id);
  }

  @Patch('restaurants/:restaurantId/orders/:orderId/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Atualizar status do pedido',
    description:
      'Atualiza o status de um pedido pertencente ao restaurante do usuário autenticado.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'ID do restaurante',
    example: 'restaurant-123',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID do pedido',
    example: 'order-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Status do pedido atualizado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Transição de status inválida ou dados inválidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurante ou pedido não encontrado.',
  })
  updateStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req,
  ) {
    return this.ordersService.updateStatus(
      restaurantId,
      orderId,
      req.user.id,
      dto,
    );
  }
}
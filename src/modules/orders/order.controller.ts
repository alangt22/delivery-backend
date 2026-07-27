import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateOrderStatusDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateOrderDto, 
    @Req() req
  ) {
    return this.ordersService.create(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findMyOrders(
    @Req() req
  ) {
    return this.ordersService.findMyOrders(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findMyOrderById(
    @Param('id') id: string,
    @Req() req,
  ) {
    return this.ordersService.findMyOrderById(id, req.user.id);
  }

  @Patch('restaurants/:restaurantId/orders/:orderId/status')
  @UseGuards(JwtAuthGuard) 
  updateStatus(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req,
  ) {
    return this.ordersService.updateStatus(restaurantId, orderId, req.user.id, dto);
  }
}

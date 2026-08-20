import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateOrderStatusDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findMyOrders(
    @Req() req
  ) {
    return this.ordersService.findMyOrders(req.user.id);
  }

  @Get('restaurants/:restaurantId')
  @UseGuards(JwtAuthGuard)
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

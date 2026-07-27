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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { UpdateOrderStatusDto } from '../orders/dto/update-order.dto';
import { OrdersService } from '../orders/order.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req, @Body() dto: CreateRestaurantDto) {
    return this.restaurantsService.create(dto, req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req) {
    return this.restaurantsService.findAllByOwner(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string, @Req() req) {
    return this.restaurantsService.findById(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.restaurantsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string, @Req() req) {
    return this.restaurantsService.remove(id, req.user.id);
  }

}

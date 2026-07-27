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
import { AddressesService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(dto, req.user.id);
  } 

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req) {
    return this.addressesService.findAllByUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string, @Req() req) {
    return this.addressesService.findById(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string, @Req() req) {
    return this.addressesService.remove(id, req.user.id);
  }
}

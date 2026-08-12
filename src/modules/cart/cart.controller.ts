import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddCartDto } from './dto/add-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
export class CartController {
    constructor(
        private readonly cartService: CartService
    ) { }

    @Post('/items')
    @UseGuards(JwtAuthGuard)
    async addProduct(
        @Req() req,
        @Body() dto: AddCartDto
    ) {
        return this.cartService.addProduct(req.user.id, dto.productId, dto.quantity);
    }


    @Get()
    @UseGuards(JwtAuthGuard)
    async getCart(
        @Req() req
    ) {
        return this.cartService.getCart(req.user.id);
    }


    @Patch('/items/:itemId')
    @UseGuards(JwtAuthGuard)
    async updateItemQuantity(
        @Req() req,
        @Param('itemId') itemId: string,
        @Body() updateCartItemDto: UpdateCartItemDto,
    ) {
        return this.cartService.updateItemQuantity(
            req.user.id,
            itemId,
            updateCartItemDto.quantity,
        );
    }


    @Delete('/items/:itemId')
    @UseGuards(JwtAuthGuard)
    async removeCartItem(
        @Req() req,
        @Param('itemId') itemId: string,
    ) {
        return this.cartService.removeCartItem(
            req.user.id,
            itemId,
        );
    }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddCartDto } from './dto/add-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
  ) {}

  @Post('/items')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Adicionar produto ao carrinho',
    description:
      'Adiciona um produto ao carrinho do usuário autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Produto adicionado ao carrinho com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Quantidade inválida, produto indisponível ou produto de outro restaurante.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado.',
  })
  async addProduct(
    @Req() req,
    @Body() dto: AddCartDto,
  ) {
    return this.cartService.addProduct(
      req.user.id,
      dto.productId,
      dto.quantity,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Consultar carrinho',
    description:
      'Retorna o carrinho atual do usuário autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Carrinho retornado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  async getCart(@Req() req) {
    return this.cartService.getCart(req.user.id);
  }

  @Patch('/items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Atualizar quantidade de item',
    description:
      'Atualiza a quantidade de um item pertencente ao carrinho do usuário.',
  })
  @ApiParam({
    name: 'itemId',
    description: 'ID do item do carrinho',
    example: 'cart-item-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Quantidade atualizada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Quantidade inválida.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Item ou carrinho não encontrado.',
  })
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
  @ApiOperation({
    summary: 'Remover item do carrinho',
    description:
      'Remove um item do carrinho do usuário autenticado.',
  })
  @ApiParam({
    name: 'itemId',
    description: 'ID do item do carrinho',
    example: 'cart-item-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Item removido com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Item ou carrinho não encontrado.',
  })
  async removeCartItem(
    @Req() req,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeCartItem(
      req.user.id,
      itemId,
    );
  }

  @Post('/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Finalizar carrinho',
    description:
      'Valida o carrinho, endereço e produtos e cria o pedido.',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout realizado e pedido criado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Carrinho vazio, produto indisponível ou dados inválidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Carrinho ou endereço não encontrado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Houve alteração de preço e ela não foi aceita pelo cliente.',
  })
  async checkout(
    @Req() req,
    @Body() dto: CheckoutCartDto,
  ) {
    return this.cartService.checkout(
      req.user.id,
      dto.addressId,
      dto.acceptPriceChanges,
    );
  }
}
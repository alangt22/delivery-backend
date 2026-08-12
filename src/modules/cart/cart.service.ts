import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cart } from '@prisma/client';
@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) { }


  private async createCart(
    userId: string,
    restaurantId: string,
  ) {
    return this.prisma.cart.create({
      data: {
        userId,
        restaurantId,
      },
    });
  }

  private async findOrCreateCart(
    userId: string,
    restaurantId: string,
  ): Promise<Cart> {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      return this.createCart(userId, restaurantId);
    }

    if (cart.restaurantId !== restaurantId) {
      throw new BadRequestException(
        'Seu carrinho já possui produtos de outro restaurante.',
      );
    }

    return cart;
  }

  private async findCartItem(cartId: string, productId: string) {
    return this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
    });
  }

  private async createCartItem(cartId: string, productId: string, quantity: number) {
    return this.prisma.cartItem.create({
      data: {
        cartId,
        productId,
        quantity,
      },
    });
  }

  private async updateCartItemQuantity(cartItemId: string, newQuantity: number) {
    return this.prisma.cartItem.update({
      where: {
        id: cartItemId,
      },
      data: {
        quantity: newQuantity,
      },
    });
  }

  private async findCartDetails(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        id: cartId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Carrinho não encontrado.');
    }

    const items = cart.items.map((item) => {
      const subtotal = item.product.price * item.quantity;

      return {
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        subtotal: Number(subtotal.toFixed(2)),
      }
    });

    const totalAmount = Number(
      cart.items
        .reduce((total, item) => {
          return total + item.product.price * item.quantity;
        }, 0).toFixed(2),
    )

    return {
      id: cart.id,
      restaurantId: cart.restaurantId,
      items,
      totalAmount,
    };
  }

  private async findCartItemById(cartId: string, cartItemId: string) {
    return this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cartId,
      },
    });
  }

  async addProduct(userId: string, productId: string, quantity: number) {
    const product = await this.productsService.findAvailableById(productId);

    const cart = await this.findOrCreateCart(userId, product.category.restaurantId);

    const cartItem = await this.findCartItem(cart.id, product.id);

    if (cartItem) {
      const newQuantity = cartItem.quantity + quantity;
      await this.updateCartItemQuantity(cartItem.id, newQuantity);
    } else {
      await this.createCartItem(cart.id, product.id, quantity);
    }

    return this.findCartDetails(cart.id);
  }

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      return {
        items: [],
        totalAmount: 0,
      };
    }

    return this.findCartDetails(cart.id);
  }


  async updateItemQuantity(userId: string, cartItemId: string, quantity: number) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      throw new NotFoundException('Carrinho não encontrado.');
    }

    const cartItem = await this.findCartItemById(cart.id, cartItemId);

    if (!cartItem) {
      throw new NotFoundException('Item do carrinho não encontrado.');
    }

    await this.updateCartItemQuantity(cartItem.id, quantity);

    return this.findCartDetails(cart.id);
  }


  async removeCartItem(userId: string, cartItemId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
    });

    if (!cart) {
      throw new NotFoundException('Carrinho não encontrado.');
    }

    const cartItem = await this.findCartItemById(cart.id, cartItemId);

    if (!cartItem) {
      throw new NotFoundException('Item do carrinho não encontrado.');
    }

    await this.prisma.cartItem.delete({
      where: {
        id: cartItem.id,
      },
    });

    return this.findCartDetails(cart.id);
  }
}

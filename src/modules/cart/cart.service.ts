import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddressesService } from '../addresses/address.service';
import { Cart, OrderStatus } from '@prisma/client';
@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly addressesService: AddressesService
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

  private async createCartItem(cartId: string, productId: string, quantity: number, unitPrice: number) {
    return this.prisma.cartItem.create({
      data: {
        cartId,
        productId,
        quantity,
        unitPrice,
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
      const subtotal = item.unitPrice * item.quantity;
      const priceChanged = item.unitPrice !== item.product.price;

      return {
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: Number(subtotal.toFixed(2)),
        currentPrice: item.product.price,
        priceChanged,
      }
    });

    const totalAmount = Number(
      cart.items
        .reduce((total, item) => {
          return total + item.unitPrice * item.quantity;
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
      await this.createCartItem(cart.id, product.id, quantity, product.price);
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


  async checkout(userId: string, addressId: string, acceptPriceChanges: boolean) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
      include: {
        items: true
      }
    });

    if (!cart) {
      throw new NotFoundException('Carrinho não encontrado.');
    }

    if (cart.items.length === 0) {
      throw new BadRequestException('O carrinho está vazio.');
    }

    const address = await this.addressesService.findById(addressId, userId);

    const productIds = cart.items.map((item) => item.productId);

    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      include: {
        category: {
          include: {
            restaurant: true,
          },
        },
      },
    });

    if (products.length !== cart.items.length) {
      throw new NotFoundException(
        'Algum produto do carrinho não foi encontrado.',
      );
    }

    if (products.some((product) => !product.isAvailable)) {
      throw new BadRequestException(
        'Algum produto do carrinho não está mais disponível.',
      );
    }

    if (
      products.some(
        (product) => product.category.restaurant.id !== cart.restaurantId,
      )
    ) {
      throw new BadRequestException(
        'Algum produto não pertence ao restaurante do carrinho.',
      );
    }

    const priceChanges = cart.items
      .map((item) => {
        const product = products.find(
          (product) => product.id === item.productId,
        );

        if (!product) {
          return null;
        }

        if (item.unitPrice !== product.price) {
          return {
            productId: product.id,
            productName: product.name,
            oldPrice: item.unitPrice,
            newPrice: product.price,
          };
        }

        return null;
      })
      .filter((item) => item !== null);

    if (priceChanges.length > 0 && !acceptPriceChanges) {
      throw new ConflictException({
        message: 'Alguns produtos tiveram alteração de preço.',
        code: 'PRICE_CHANGED',
        items: priceChanges,
      });
    }

    const productsMap = new Map(products.map((product) => [product.id, product]));

    const orderItemsData = cart.items.map((item) => {
      // encontrar product usando productsMap
      const product = productsMap.get(item.productId);

      if (!product) {
        throw new NotFoundException(
          `Produto não encontrado.`,
        );
      }
      // descobrir unitPrice
      const unitPrice = item.unitPrice !== product.price ? product.price : item.unitPrice;
      // subtoal
      const subtotal = unitPrice * item.quantity;
      // retornar os dados
      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      };
    });

    const totalAmount = orderItemsData.reduce(
      (total, item) => total + item.subtotal,
      0,
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: userId,
          restaurantId: cart.restaurantId,

          addressId: address.id,
          addressStreet: address.street,
          addressNumber: address.number,
          addressDistrict: address.district,
          addressCity: address.city,
          addressState: address.state,
          addressZipCode: address.zipCode,
          addressComplement: address.complement,

          totalAmount,
          status: OrderStatus.PENDING,
        },
      });

      await tx.orderItem.createMany({
        data: orderItemsData.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
      

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      return order;
    });


    return this.prisma.order.findUnique({
      where: {
        id: order.id,
      },
      include: {
        items: true,
        restaurant: true,
        address: true
      },
    });
  }
}

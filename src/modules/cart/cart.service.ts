import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddressesService } from '../addresses/address.service';
import { Cart, OrderStatus, Prisma } from '@prisma/client';
@Injectable()
export class CartService {
  private readonly MAX_CART_ITEM_QUANTITY = 99;
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

    if (cart) {
      if (cart.restaurantId !== restaurantId) {
        throw new BadRequestException(
          'Seu carrinho já possui produtos de outro restaurante.',
        );
      }

      return cart;
    }

    try {
      return await this.createCart(userId, restaurantId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingCart = await this.prisma.cart.findUnique({
          where: {
            userId,
          },
        });

        if (!existingCart) {
          throw error;
        }

        if (existingCart.restaurantId !== restaurantId) {
          throw new BadRequestException(
            'Seu carrinho já possui produtos de outro restaurante.',
          );
        }

        return existingCart;
      }

      throw error;
    }
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

  private async createCartItem(
    cartId: string,
    productId: string,
    quantity: number,
    unitPrice: Prisma.Decimal,
  ) {
    try {
      return await this.prisma.cartItem.create({
        data: {
          cartId,
          productId,
          quantity,
          unitPrice,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingCartItem = await this.findCartItem(
          cartId,
          productId,
        );

        if (!existingCartItem) {
          throw error;
        }

        return this.incrementCartItemQuantity(
          existingCartItem.id,
          quantity,
        );
      }

      throw error;
    }
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

  private async incrementCartItemQuantity(
    cartItemId: string,
    quantity: number,
  ) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: {
        id: cartItemId,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Item do carrinho não encontrado.');
    }

    const newQuantity = cartItem.quantity + quantity;

    if (newQuantity > this.MAX_CART_ITEM_QUANTITY) {
      throw new BadRequestException(
        `A quantidade máxima por produto é ${this.MAX_CART_ITEM_QUANTITY}.`,
      );
    }

    return this.prisma.cartItem.update({
      where: {
        id: cartItemId,
      },
      data: {
        quantity: {
          increment: quantity,
        },
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
      const subtotal = item.unitPrice.mul(item.quantity);
      const priceChanged = !item.unitPrice.equals(item.product.price);

      return {
        itemId: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: subtotal.toNumber(),
        currentPrice: item.product.price,
        priceChanged,
      }
    });

    const totalAmount = cart.items
      .reduce(
        (total, item) => total.add(item.unitPrice.mul(item.quantity)),
        new Prisma.Decimal(0),
      )
      .toNumber();

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
    if (quantity <= 0) {
      throw new BadRequestException(
        'A quantidade deve ser maior que zero.',
      );
    }

    if (quantity > this.MAX_CART_ITEM_QUANTITY) {
      throw new BadRequestException(
        `A quantidade máxima por produto é ${this.MAX_CART_ITEM_QUANTITY}.`,
      );
    }

    const product = await this.productsService.findAvailableById(productId);

    const cart = await this.findOrCreateCart(userId, product.category.restaurantId);

    const cartItem = await this.findCartItem(cart.id, product.id);

    if (cartItem) {
      await this.incrementCartItemQuantity(
        cartItem.id,
        quantity,
      );
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

    const remainingItems = await this.prisma.cartItem.count({
      where: {
        cartId: cart.id,
      },
    });

    if (remainingItems === 0) {
      await this.prisma.cart.delete({
        where: {
          id: cart.id,
        },
      });

      return {
        items: [],
        totalAmount: 0,
      };
    }

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
        (product) =>
          product.category.restaurant.status !== 'APPROVED',
      )
    ) {
      throw new BadRequestException(
        'O restaurante não está disponível para pedidos.',
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

        if (!item.unitPrice.equals(product.price)) {
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
      const unitPrice = !item.unitPrice.equals(product.price)
        ? product.price
        : item.unitPrice;

      const subtotal = unitPrice.mul(item.quantity);
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
      (total, item) => total.add(item.subtotal),
      new Prisma.Decimal(0),
    );

    let order;

    try {
      order = await this.prisma.$transaction(
        async (tx) => {
          // Recarrega o carrinho DENTRO da transação.
          // Isso evita trabalhar com uma leitura antiga.
          const currentCart = await tx.cart.findUnique({
            where: {
              id: cart.id,
            },
            include: {
              items: true,
            },
          });

          if (!currentCart) {
            throw new NotFoundException('Carrinho não encontrado.');
          }

          // Se outro checkout já processou o carrinho,
          // não existem mais itens para processar.
          if (currentCart.items.length === 0) {
            throw new ConflictException(
              'O carrinho já foi finalizado.',
            );
          }

          const order = await tx.order.create({
            data: {
              customerId: userId,
              restaurantId: currentCart.restaurantId,
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
              cartId: currentCart.id,
            },
          });

          return order;
        },
        {
          isolationLevel: 'Serializable',
        },
      );
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Error &&
          error.message.includes('Transaction failed due to a write conflict'))
      ) {
        throw new ConflictException(
          'O checkout já está sendo processado. Tente novamente.',
        );
      }

      throw error;
    }


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

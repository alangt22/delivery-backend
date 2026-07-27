import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddressesService } from '../addresses/address.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client/wasm';

@Injectable()
export class OrdersService {
  constructor(
    private addressesService: AddressesService,
    private prisma: PrismaService,
    private restaurantService: RestaurantsService,
  ) {}

  async create(dto: CreateOrderDto, customerId: string) {
    const address = await this.addressesService.findById(
      dto.addressId,
      customerId,
    );
    const productIds = dto.items.map((item) => item.productId);

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

    if (products.length !== dto.items.length) {
      throw new NotFoundException('Algum produto não foi encontrado');
    }

    if (products.some((product) => !product.isAvailable)) {
      throw new BadRequestException('Algum produto não está disponível');
    }

    if (
      products.some(
        (product) =>
          product.category.restaurant.id !== products[0].category.restaurant.id,
      )
    ) {
      throw new BadRequestException(
        'Todos os produtos devem ser do mesmo restaurante',
      );
    }

    // calcular o total do pedido
    const totalAmount = dto.items.reduce((acc, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new NotFoundException('Produto não encontrado');
      }
      return acc + product.price * item.quantity;
    }, 0);

    const restaurantId = products[0].category.restaurant.id;

    const order = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId,
          addressId: dto.addressId,
          restaurantId,
          totalAmount,
        },
      });

      await tx.orderItem.createMany({
        data: dto.items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          if (!product) {
            throw new NotFoundException('Produto não encontrado');
          }
          return {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            productName: product.name,
            unitPrice: product.price,
          };
        }),
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
        address: true,
      },
    });
  }

  async findMyOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: {
        customerId,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findMyOrderById(id: string, customerId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        customerId,
      },
      include: {
        items: true,
        restaurant: true,
        address: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Pedido nao encontrado');
    }
    return order;
  }

  async findMyRestaurantOrders(restaurantId: string, ownerId: string) {
    //validar  restaurante pertence ao dono usando etod do restaurant service
    await this.restaurantService.findById(restaurantId, ownerId);

    return this.prisma.order.findMany({
      where: {
        restaurantId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ) {
    switch (currentStatus) {
      case OrderStatus.PENDING:
        if (
          newStatus !== OrderStatus.CONFIRMED &&
          newStatus !== OrderStatus.CANCELLED
        ) {
          throw new BadRequestException(
            'Transição de status inválida.',
          );
        }
        break;
      case OrderStatus.CONFIRMED:
        if (
          newStatus !== OrderStatus.PREPARING &&
          newStatus !== OrderStatus.CANCELLED
        ) {
          throw new BadRequestException(
            'Transição de status inválida.',
          );
        }
        break;
      case OrderStatus.PREPARING:
        if (newStatus !== OrderStatus.OUT_FOR_DELIVERY) {
          throw new BadRequestException(
            'Transição de status inválida.',
          );
        }
        break;
      case OrderStatus.OUT_FOR_DELIVERY:
        if (newStatus !== OrderStatus.DELIVERED) {
          throw new BadRequestException(
            'Transição de status inválida.',
          );
        }
        break;
      case OrderStatus.DELIVERED:
        throw new BadRequestException('Pedido ja foi entregue');
      case OrderStatus.CANCELLED:
        throw new BadRequestException('Pedido ja foi cancelado');
      default:
        throw new BadRequestException('Status de pedido invalido');
    }
  }
  async updateStatus(
    restaurantId: string,
    orderId: string,
    ownerId: string,
    dto: UpdateOrderStatusDto,
  ) {
    //validar  restaurante pertence ao dono usando etod do restaurant service
    await this.restaurantService.findById(restaurantId, ownerId);

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    this.validateStatusTransition(order.status, dto.status);

    return this.prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: dto.status,
      },
    });
  }
}

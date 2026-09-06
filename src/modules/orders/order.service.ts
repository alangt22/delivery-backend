import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client/wasm';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private restaurantService: RestaurantsService,
    private paymentsService: PaymentsService,
  ) { }

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

    if (dto.status === OrderStatus.CANCELLED) {
      await this.paymentsService.cancelPaymentForOrder(orderId);
    }

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

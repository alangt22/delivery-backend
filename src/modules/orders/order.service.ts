import {
  BadRequestException,
  ConflictException,
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

  // Retorna os pedidos do restaurante com apenas os dados necessários para a operação e entrega.
  async findMyRestaurantOrders(restaurantId: string, ownerId: string) {
    //validar  restaurante pertence ao dono usando etod do restaurant service
    await this.restaurantService.findById(restaurantId, ownerId);

    return this.prisma.order.findMany({
      where: {
        restaurantId,
      },
      select: {
        id: true,
        customerId: true,
        restaurantId: true,
        addressStreet: true,
        addressNumber: true,
        addressDistrict: true,
        addressCity: true,
        addressState: true,
        addressZipCode: true,
        addressComplement: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
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
    await this.restaurantService.findById(
      restaurantId,
      ownerId,
    );

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    this.validateStatusTransition(
      order.status,
      dto.status,
    );

    const result = await this.prisma.order.updateMany({
      where: {
        id: orderId,
        restaurantId,
        status: order.status,
      },
      data: {
        status: dto.status,
      },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'O status do pedido foi alterado por outra requisição.',
      );
    }

    if (dto.status === OrderStatus.CANCELLED) {
      await this.paymentsService.cancelPaymentForOrder(
        orderId,
      );
    }

    return this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });
  }
}

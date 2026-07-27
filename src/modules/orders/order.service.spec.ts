import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './order.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { AddressesService } from '../addresses/address.service';
import { OrderStatus } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;

  let prismaMock;
  let restaurantServiceMock;
  let addressServiceMock;

  beforeEach(async () => {
    prismaMock = {
      order: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    restaurantServiceMock = {
      findById: jest.fn(),
    };

    addressServiceMock = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: RestaurantsService,
          useValue: restaurantServiceMock,
        },
        {
          provide: AddressesService,
          useValue: addressServiceMock,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve atualizar um pedido de PENDING para CONFIRMED', async () => {
    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.PENDING,
    });
    prismaMock.order.update.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.CONFIRMED,
    });

    const result = await service.updateStatus(
      'restaurant-1',
      'order-1',
      'owner-1',
      { status: OrderStatus.CONFIRMED },
    );
    expect(result.id).toBe('order-1');
    expect(result.restaurantId).toBe('restaurant-1');
    expect(result.status).toBe(OrderStatus.CONFIRMED);
    expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
        restaurantId: 'restaurant-1',
      },
    });
    expect(restaurantServiceMock.findById).toHaveBeenCalledWith(
      'restaurant-1',
      'owner-1',
    );
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
      },
      data: {
        status: OrderStatus.CONFIRMED,
      },
    });
  });
});

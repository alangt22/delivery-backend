import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './order.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { OrderStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common/exceptions/bad-request.exception';
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaMock;
  let restaurantServiceMock;


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

  it('deve lançar um erro bad request quando a transição de status PENDING para DELIVERED', async () => {
    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.PENDING,
    });

    await expect(
      service.updateStatus('restaurant-1', 'order-1', 'owner-1', {
        status: OrderStatus.DELIVERED,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('deve lançar um erro bad request quando a transição de status CONFIRMED para DELIVERED', async () => {
    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.CONFIRMED,
    });

    await expect(
      service.updateStatus('restaurant-1', 'order-1', 'owner-1', {
        status: OrderStatus.DELIVERED,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('deve lançar um erro bad request quando a transição de status PREPARING para DELIVERED', async () => {
    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.PREPARING,
    });

    await expect(
      service.updateStatus('restaurant-1', 'order-1', 'owner-1', {
        status: OrderStatus.DELIVERED,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('deve lançar um erro bad request quando a transição de status DELIVERED para qualquer outra', async () => {
    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.DELIVERED,
    });

    await expect(
      service.updateStatus('restaurant-1', 'order-1', 'owner-1', {
        status: OrderStatus.CONFIRMED,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('deve lançar um erro bad request quando a transição de status CANCELLED para qualquer outra', async () => {
    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.CANCELLED,
    });

    await expect(
      service.updateStatus('restaurant-1', 'order-1', 'owner-1', {
        status: OrderStatus.CONFIRMED,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('deve lançar um erro NotFoundException  quando o pedido não for encontrado', async () => {
    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });
    prismaMock.order.findFirst.mockResolvedValue(null);

    await expect(
      service.updateStatus('restaurant-1', 'order-1', 'owner-1', {
        status: OrderStatus.CONFIRMED,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.order.update).not.toHaveBeenCalled();

    expect(restaurantServiceMock.findById).toHaveBeenCalledWith(
      'restaurant-1',
      'owner-1',
    );

    expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
        restaurantId: 'restaurant-1',
      },
    });
  });

  it('deve propagar a NotFoundException quando o restaurante não for encontrado', async () => {
    restaurantServiceMock.findById.mockRejectedValue(new NotFoundException());

    await expect(
      service.updateStatus('restaurant-1', 'order-1', 'owner-1', {
        status: OrderStatus.CONFIRMED,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.order.findFirst).not.toHaveBeenCalled();

    expect(prismaMock.order.update).not.toHaveBeenCalled();

    expect(restaurantServiceMock.findById).toHaveBeenCalledWith(
      'restaurant-1',
      'owner-1',
    );
  });
});

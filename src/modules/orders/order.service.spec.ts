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
        findMany: jest.fn(),
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

  it('deve atualizar um pedido de PENDING para CANCELLED', async () => {
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
      status: OrderStatus.CANCELLED,
    });

    const result = await service.updateStatus(
      'restaurant-1',
      'order-1',
      'owner-1',
      { status: OrderStatus.CANCELLED },
    );

    expect(result.id).toBe('order-1');
    expect(result.restaurantId).toBe('restaurant-1');
    expect(result.status).toBe(OrderStatus.CANCELLED);

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

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
      },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });
  });

  it('deve atualizar um pedido de CONFIRMED para PREPARING', async () => {
    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });

    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.CONFIRMED,
    });

    prismaMock.order.update.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.PREPARING,
    });

    const result = await service.updateStatus(
      'restaurant-1',
      'order-1',
      'owner-1',
      { status: OrderStatus.PREPARING },
    );

    expect(result.id).toBe('order-1');
    expect(result.restaurantId).toBe('restaurant-1');
    expect(result.status).toBe(OrderStatus.PREPARING);

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

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
      },
      data: {
        status: OrderStatus.PREPARING,
      },
    });
  });

  it('deve atualizar um pedido de CONFIRMED para CANCELLED', async () => {
    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });

    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.CONFIRMED,
    });

    prismaMock.order.update.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.CANCELLED,
    });

    const result = await service.updateStatus(
      'restaurant-1',
      'order-1',
      'owner-1',
      { status: OrderStatus.CANCELLED },
    );

    expect(result.id).toBe('order-1');
    expect(result.restaurantId).toBe('restaurant-1');
    expect(result.status).toBe(OrderStatus.CANCELLED);

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

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
      },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });
  });

  it('deve atualizar um pedido de PREPARING para OUT_FOR_DELIVERY', async () => {
    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });

    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.PREPARING,
    });

    prismaMock.order.update.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.OUT_FOR_DELIVERY,
    });

    const result = await service.updateStatus(
      'restaurant-1',
      'order-1',
      'owner-1',
      { status: OrderStatus.OUT_FOR_DELIVERY },
    );

    expect(result.id).toBe('order-1');
    expect(result.restaurantId).toBe('restaurant-1');
    expect(result.status).toBe(OrderStatus.OUT_FOR_DELIVERY);

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

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
      },
      data: {
        status: OrderStatus.OUT_FOR_DELIVERY,
      },
    });
  });

  it('deve atualizar um pedido de OUT_FOR_DELIVERY para DELIVERED', async () => {
    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });

    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.OUT_FOR_DELIVERY,
    });

    prismaMock.order.update.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.DELIVERED,
    });

    const result = await service.updateStatus(
      'restaurant-1',
      'order-1',
      'owner-1',
      { status: OrderStatus.DELIVERED },
    );

    expect(result.id).toBe('order-1');
    expect(result.restaurantId).toBe('restaurant-1');
    expect(result.status).toBe(OrderStatus.DELIVERED);

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

    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
      },
      data: {
        status: OrderStatus.DELIVERED,
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

  it('deve buscar os pedidos do cliente ordenados pelos mais recentes', async () => {
    const orders = [
      {
        id: 'order-1',
        customerId: 'customer-1',
        restaurant: {
          id: 'restaurant-1',
          name: 'Restaurante 1',
          logo: 'logo-1.png',
        },
      },
      {
        id: 'order-2',
        customerId: 'customer-1',
        restaurant: {
          id: 'restaurant-2',
          name: 'Restaurante 2',
          logo: 'logo-2.png',
        },
      },
    ];

    prismaMock.order.findMany.mockResolvedValue(orders);

    const result = await service.findMyOrders('customer-1');

    expect(result).toEqual(orders);

    expect(prismaMock.order.findMany).toHaveBeenCalledWith({
      where: {
        customerId: 'customer-1',
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
  });

  it('deve buscar um pedido específico do cliente', async () => {
    const order = {
      id: 'order-1',
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          quantity: 2,
          unitPrice: 25,
        },
      ],
      restaurant: {
        id: 'restaurant-1',
        name: 'Restaurante 1',
      },
      address: {
        id: 'address-1',
        street: 'Rua A',
        number: '100',
        city: 'São Paulo',
      },
    };

    prismaMock.order.findFirst.mockResolvedValue(order);

    const result = await service.findMyOrderById(
      'order-1',
      'customer-1',
    );

    expect(result).toEqual(order);

    expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
        customerId: 'customer-1',
      },
      include: {
        items: true,
        restaurant: true,
        address: true,
      },
    });
  });

  it('deve lançar NotFoundException quando o pedido não for encontrado', async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);

    await expect(
      service.findMyOrderById('order-1', 'customer-1'),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
        customerId: 'customer-1',
      },
      include: {
        items: true,
        restaurant: true,
        address: true,
      },
    });
  });

  it('deve buscar os pedidos do restaurante do proprietário', async () => {
    const orders = [
      {
        id: 'order-1',
        restaurantId: 'restaurant-1',
        customer: {
          id: 'customer-1',
          name: 'Cliente 1',
        },
      },
      {
        id: 'order-2',
        restaurantId: 'restaurant-1',
        customer: {
          id: 'customer-2',
          name: 'Cliente 2',
        },
      },
    ];

    restaurantServiceMock.findById.mockResolvedValue({
      id: 'restaurant-1',
      ownerId: 'owner-1',
    });

    prismaMock.order.findMany.mockResolvedValue(orders);

    const result = await service.findMyRestaurantOrders(
      'restaurant-1',
      'owner-1',
    );

    expect(result).toEqual(orders);

    expect(restaurantServiceMock.findById).toHaveBeenCalledWith(
      'restaurant-1',
      'owner-1',
    );

    expect(prismaMock.order.findMany).toHaveBeenCalledWith({
      where: {
        restaurantId: 'restaurant-1',
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
  });

  it('deve propagar o erro quando o restaurante não pertencer ao proprietário', async () => {
    restaurantServiceMock.findById.mockRejectedValue(
      new NotFoundException(),
    );

    await expect(
      service.findMyRestaurantOrders(
        'restaurant-1',
        'owner-1',
      ),
    ).rejects.toThrow(NotFoundException);

    expect(restaurantServiceMock.findById).toHaveBeenCalledWith(
      'restaurant-1',
      'owner-1',
    );

    expect(prismaMock.order.findMany).not.toHaveBeenCalled();
  });
});

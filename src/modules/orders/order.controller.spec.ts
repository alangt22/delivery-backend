import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { OrdersController } from './order.controller';
import { OrdersService } from './order.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersServiceMock: any;

  const userId = 'user-1';
  const restaurantId = 'restaurant-1';
  const orderId = 'order-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    ordersServiceMock = {
      findMyOrders: jest.fn(),
      findMyRestaurantOrders: jest.fn(),
      findMyOrderById: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: ordersServiceMock,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(
      OrdersController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deve buscar os pedidos do usuário', async () => {
    const orders = [
      {
        id: orderId,
        customerId: userId,
        restaurantId,
        totalAmount: 50,
      },
    ];

    ordersServiceMock.findMyOrders.mockResolvedValue(orders);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.findMyOrders(req);

    expect(ordersServiceMock.findMyOrders).toHaveBeenCalledWith(
      userId,
    );

    expect(result).toEqual(orders);
  });

  it('deve buscar os pedidos do restaurante do usuário', async () => {
    const orders = [
      {
        id: orderId,
        customerId: 'customer-1',
        restaurantId,
        totalAmount: 75,
      },
    ];

    ordersServiceMock.findMyRestaurantOrders.mockResolvedValue(
      orders,
    );

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.findMyRestaurantOrders(
      restaurantId,
      req,
    );

    expect(
      ordersServiceMock.findMyRestaurantOrders,
    ).toHaveBeenCalledWith(
      restaurantId,
      userId,
    );

    expect(result).toEqual(orders);
  });

  it('deve buscar um pedido específico do usuário', async () => {
    const order = {
      id: orderId,
      customerId: userId,
      restaurantId,
      totalAmount: 50,
    };

    ordersServiceMock.findMyOrderById.mockResolvedValue(order);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.findMyOrderById(
      orderId,
      req,
    );

    expect(
      ordersServiceMock.findMyOrderById,
    ).toHaveBeenCalledWith(
      orderId,
      userId,
    );

    expect(result).toEqual(order);
  });

  it('deve atualizar o status de um pedido', async () => {
    const dto = {
      status: OrderStatus.CONFIRMED,
    };

    const response = {
      id: orderId,
      restaurantId,
      status: OrderStatus.CONFIRMED,
    };

    ordersServiceMock.updateStatus.mockResolvedValue(response);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.updateStatus(
      restaurantId,
      orderId,
      dto,
      req,
    );

    expect(ordersServiceMock.updateStatus).toHaveBeenCalledWith(
      restaurantId,
      orderId,
      userId,
      dto,
    );

    expect(result).toEqual(response);
  });
});
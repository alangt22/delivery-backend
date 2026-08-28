import { Test, TestingModule } from '@nestjs/testing';

import { CartController } from './cart.controller';

import { CartService } from './cart.service';

describe('CartController', () => {
  let controller: CartController;

  const cartServiceMock = {
    addProduct: jest.fn(),
    getCart: jest.fn(),
    updateItemQuantity: jest.fn(),
    removeCartItem: jest.fn(),
    checkout: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: cartServiceMock,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deve adicionar um produto ao carrinho', async () => {
    const req = {
      user: {
        id: 'user-1',
      },
    };

    const dto = {
      productId: 'product-1',
      quantity: 2,
    };

    const cart = {
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      totalAmount: 50,
    };

    cartServiceMock.addProduct.mockResolvedValue(cart);

    const result = await controller.addProduct(req, dto);

    expect(cartServiceMock.addProduct).toHaveBeenCalledWith(
      'user-1',
      'product-1',
      2,
    );

    expect(result).toEqual(cart);
  });

  it('deve buscar o carrinho do usuário', async () => {
    const req = {
      user: {
        id: 'user-1',
      },
    };

    const cart = {
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      totalAmount: 50,
    };

    cartServiceMock.getCart.mockResolvedValue(cart);

    const result = await controller.getCart(req);

    expect(cartServiceMock.getCart).toHaveBeenCalledWith('user-1');

    expect(result).toEqual(cart);
  });

  it('deve atualizar a quantidade de um item do carrinho', async () => {
    const req = {
      user: {
        id: 'user-1',
      },
    };

    const itemId = 'cart-item-1';

    const dto = {
      quantity: 5,
    };

    const cart = {
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      totalAmount: 125,
    };

    cartServiceMock.updateItemQuantity.mockResolvedValue(cart);

    const result = await controller.updateItemQuantity(
      req,
      itemId,
      dto,
    );

    expect(cartServiceMock.updateItemQuantity).toHaveBeenCalledWith(
      'user-1',
      'cart-item-1',
      5,
    );

    expect(result).toEqual(cart);
  });

  it('deve remover um item do carrinho', async () => {
    const req = {
      user: {
        id: 'user-1',
      },
    };

    const itemId = 'cart-item-1';

    const cart = {
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      totalAmount: 50,
    };

    cartServiceMock.removeCartItem.mockResolvedValue(cart);

    const result = await controller.removeCartItem(
      req,
      itemId,
    );

    expect(cartServiceMock.removeCartItem).toHaveBeenCalledWith(
      'user-1',
      'cart-item-1',
    );

    expect(result).toEqual(cart);
  });

  it('deve realizar o checkout do carrinho', async () => {
    const req = {
      user: {
        id: 'user-1',
      },
    };

    const dto = {
      addressId: 'address-1',
      acceptPriceChanges: true,
    };

    const order = {
      id: 'order-1',
      restaurantId: 'restaurant-1',
      totalAmount: 50,
    };

    cartServiceMock.checkout.mockResolvedValue(order);

    const result = await controller.checkout(req, dto);

    expect(cartServiceMock.checkout).toHaveBeenCalledWith(
      'user-1',
      'address-1',
      true,
    );

    expect(result).toEqual(order);
  });
});
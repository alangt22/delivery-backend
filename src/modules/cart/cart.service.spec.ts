import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { AddressesService } from '../addresses/address.service';
import { ProductsService } from '../products/products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let prismaMock: any;
  let addressesServiceMock: any;
  let productsServiceMock: any;
  let transactionMock: any;

  const userId = 'user-1';
  const addressId = 'address-1';

  const address = {
    id: addressId,
    street: 'Rua das Flores',
    number: '123',
    district: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01000-000',
    complement: 'Apto 10',
    userId,
  };

  const createCart = (items: any[]) => ({
    id: 'cart-1',
    userId,
    restaurantId: 'restaurant-1',
    items,
  });

  const createProduct = (overrides = {}) => ({
    id: 'product-1',
    name: 'Pizza',
    price: 25,
    isAvailable: true,
    category: {
      restaurant: {
        id: 'restaurant-1',
      },
    },
    ...overrides,
  });

  beforeEach(async () => {
    transactionMock = {
      order: {
        create: jest.fn(),
      },
      orderItem: {
        createMany: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
    };

    prismaMock = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      cartItem: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      order: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback(transactionMock)),
    };

    addressesServiceMock = {
      findById: jest.fn(),
    };

    productsServiceMock = {
      findAvailableById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AddressesService,
          useValue: addressesServiceMock,
        },
        {
          provide: ProductsService,
          useValue: productsServiceMock,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('deve criar pedido, itens e limpar o carrinho dentro da transação', async () => {
    const cart = createCart([
      { productId: 'product-1', quantity: 2, unitPrice: 25 },
      { productId: 'product-2', quantity: 1, unitPrice: 10 },
    ]);
    const productOne = createProduct();
    const productTwo = createProduct({
      id: 'product-2',
      name: 'Refrigerante',
      price: 10,
    });
    const createdOrder = { id: 'order-1' };
    const orderDetails = { id: 'order-1', items: [], restaurant: {}, address };
    const operations: string[] = [];

    prismaMock.cart.findUnique.mockResolvedValue(cart);
    addressesServiceMock.findById.mockResolvedValue(address);
    prismaMock.product.findMany.mockResolvedValue([productOne, productTwo]);
    transactionMock.order.create.mockImplementation(async () => {
      operations.push('order.create');
      return createdOrder;
    });
    transactionMock.orderItem.createMany.mockImplementation(async () => {
      operations.push('orderItem.createMany');
    });
    transactionMock.cartItem.deleteMany.mockImplementation(async () => {
      operations.push('cartItem.deleteMany');
    });
    prismaMock.order.findUnique.mockResolvedValue(orderDetails);

    const result = await service.checkout(userId, addressId, false);

    expect(prismaMock.cart.findUnique).toHaveBeenCalledWith({
      where: { userId },
      include: { items: true },
    });
    expect(addressesServiceMock.findById).toHaveBeenCalledWith(addressId, userId);
    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['product-1', 'product-2'] } },
      include: { category: { include: { restaurant: true } } },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(transactionMock.order.create).toHaveBeenCalledWith({
      data: {
        customerId: userId,
        restaurantId: 'restaurant-1',
        addressId,
        addressStreet: address.street,
        addressNumber: address.number,
        addressDistrict: address.district,
        addressCity: address.city,
        addressState: address.state,
        addressZipCode: address.zipCode,
        addressComplement: address.complement,
        totalAmount: 60,
        status: OrderStatus.PENDING,
      },
    });
    expect(transactionMock.orderItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          orderId: 'order-1',
          productId: 'product-1',
          productName: 'Pizza',
          quantity: 2,
          unitPrice: 25,
        },
        {
          orderId: 'order-1',
          productId: 'product-2',
          productName: 'Refrigerante',
          quantity: 1,
          unitPrice: 10,
        },
      ],
    });
    expect(transactionMock.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 'cart-1' },
    });
    expect(operations).toEqual([
      'order.create',
      'orderItem.createMany',
      'cartItem.deleteMany',
    ]);
    expect(prismaMock.order.findUnique).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      include: { items: true, restaurant: true, address: true },
    });
    expect(result).toBe(orderDetails);
  });

  it('deve usar o preço atual quando houver alteração aceita pelo cliente', async () => {
    const cart = createCart([
      { productId: 'product-1', quantity: 2, unitPrice: 20 },
    ]);
    const product = createProduct({ price: 25 });

    prismaMock.cart.findUnique.mockResolvedValue(cart);
    addressesServiceMock.findById.mockResolvedValue(address);
    prismaMock.product.findMany.mockResolvedValue([product]);
    transactionMock.order.create.mockResolvedValue({ id: 'order-1' });
    prismaMock.order.findUnique.mockResolvedValue({ id: 'order-1' });

    await service.checkout(userId, addressId, true);

    expect(transactionMock.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalAmount: 50 }),
      }),
    );
    expect(transactionMock.orderItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          productId: 'product-1',
          unitPrice: 25,
          quantity: 2,
        }),
      ],
    });
  });

  it('deve lançar erro quando o carrinho não existe sem iniciar transação', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(null);

    await expect(service.checkout(userId, addressId, false)).rejects.toThrow(
      NotFoundException,
    );

    expect(addressesServiceMock.findById).not.toHaveBeenCalled();
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deve lançar erro quando o carrinho está vazio sem iniciar transação', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(createCart([]));

    await expect(service.checkout(userId, addressId, false)).rejects.toThrow(
      BadRequestException,
    );

    expect(addressesServiceMock.findById).not.toHaveBeenCalled();
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deve propagar erro do endereço sem iniciar transação', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(
      createCart([{ productId: 'product-1', quantity: 1, unitPrice: 25 }]),
    );
    addressesServiceMock.findById.mockRejectedValue(new NotFoundException());

    await expect(service.checkout(userId, addressId, false)).rejects.toThrow(
      NotFoundException,
    );

    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deve lançar erro quando algum produto do carrinho não é encontrado', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(
      createCart([{ productId: 'product-1', quantity: 1, unitPrice: 25 }]),
    );
    addressesServiceMock.findById.mockResolvedValue(address);
    prismaMock.product.findMany.mockResolvedValue([]);

    await expect(service.checkout(userId, addressId, false)).rejects.toThrow(
      NotFoundException,
    );

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deve lançar erro quando algum produto está indisponível', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(
      createCart([{ productId: 'product-1', quantity: 1, unitPrice: 25 }]),
    );
    addressesServiceMock.findById.mockResolvedValue(address);
    prismaMock.product.findMany.mockResolvedValue([
      createProduct({ isAvailable: false }),
    ]);

    await expect(service.checkout(userId, addressId, false)).rejects.toThrow(
      BadRequestException,
    );

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deve lançar erro quando algum produto pertence a outro restaurante', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(
      createCart([{ productId: 'product-1', quantity: 1, unitPrice: 25 }]),
    );
    addressesServiceMock.findById.mockResolvedValue(address);
    prismaMock.product.findMany.mockResolvedValue([
      createProduct({
        category: {
          restaurant: {
            id: 'restaurant-2',
          },
        },
      }),
    ]);

    await expect(service.checkout(userId, addressId, false)).rejects.toThrow(
      BadRequestException,
    );

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deve informar alteração de preço sem iniciar transação quando o cliente não aceita', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(
      createCart([{ productId: 'product-1', quantity: 1, unitPrice: 20 }]),
    );
    addressesServiceMock.findById.mockResolvedValue(address);
    prismaMock.product.findMany.mockResolvedValue([createProduct({ price: 25 })]);

    await expect(service.checkout(userId, addressId, false)).rejects.toMatchObject({
      response: {
        message: 'Alguns produtos tiveram alteração de preço.',
        code: 'PRICE_CHANGED',
        items: [
          {
            productId: 'product-1',
            productName: 'Pizza',
            oldPrice: 20,
            newPrice: 25,
          },
        ],
      },
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(transactionMock.order.create).not.toHaveBeenCalled();
    expect(transactionMock.orderItem.createMany).not.toHaveBeenCalled();
    expect(transactionMock.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('deve criar uma ConflictException quando há alteração de preço sem aceite', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(
      createCart([{ productId: 'product-1', quantity: 1, unitPrice: 20 }]),
    );
    addressesServiceMock.findById.mockResolvedValue(address);
    prismaMock.product.findMany.mockResolvedValue([createProduct({ price: 25 })]);

    await expect(service.checkout(userId, addressId, false)).rejects.toThrow(
      ConflictException,
    );
  });

  it('deve informar todas as alterações de preço quando houver mais de um produto alterado', async () => {
    const cart = createCart([
      {
        productId: 'product-1',
        quantity: 2,
        unitPrice: 20,
      },
      {
        productId: 'product-2',
        quantity: 1,
        unitPrice: 10,
      },
    ]);

    const productOne = createProduct({
      id: 'product-1',
      name: 'Pizza',
      price: 25,
    });

    const productTwo = createProduct({
      id: 'product-2',
      name: 'Refrigerante',
      price: 12,
    });

    prismaMock.cart.findUnique.mockResolvedValue(cart);
    addressesServiceMock.findById.mockResolvedValue(address);
    prismaMock.product.findMany.mockResolvedValue([
      productOne,
      productTwo,
    ]);

    await expect(
      service.checkout(userId, addressId, false),
    ).rejects.toMatchObject({
      response: {
        message: 'Alguns produtos tiveram alteração de preço.',
        code: 'PRICE_CHANGED',
        items: [
          {
            productId: 'product-1',
            productName: 'Pizza',
            oldPrice: 20,
            newPrice: 25,
          },
          {
            productId: 'product-2',
            productName: 'Refrigerante',
            oldPrice: 10,
            newPrice: 12,
          },
        ],
      },
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deve criar um novo carrinho ao adicionar produto quando o usuário ainda não possui carrinho', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(null);

    const product = createProduct({
      price: 25,
      category: {
        restaurantId: 'restaurant-1',
      },
    });

    productsServiceMock.findAvailableById.mockResolvedValue(product);

    prismaMock.cart.create.mockResolvedValue({
      id: 'cart-1',
      userId,
      restaurantId: 'restaurant-1',
    });

    prismaMock.cartItem.findUnique.mockResolvedValue(null);

    prismaMock.cartItem.create.mockResolvedValue({
      id: 'cart-item-1',
      cartId: 'cart-1',
      productId: 'product-1',
      quantity: 1,
      unitPrice: 25,
    });

    prismaMock.cart.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'cart-1',
        userId,
        restaurantId: 'restaurant-1',
        items: [
          {
            productId: 'product-1',
            quantity: 1,
            unitPrice: 25,
            product: {
              id: 'product-1',
              name: 'Produto 1',
              price: 25,
            },
          },
        ],
      });

    const result = await service.addProduct(
      userId,
      'product-1',
      1,
    );

    expect(productsServiceMock.findAvailableById).toHaveBeenCalledWith(
      'product-1',
    );

    expect(prismaMock.cart.create).toHaveBeenCalledWith({
      data: {
        userId,
        restaurantId: 'restaurant-1',
      },
    });

    expect(prismaMock.cartItem.create).toHaveBeenCalledWith({
      data: {
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 1,
        unitPrice: 25,
      },
    });

    expect(result).toMatchObject({
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      totalAmount: 25,
    });
  });

  it('deve adicionar produto a um carrinho existente quando o produto ainda não está no carrinho', async () => {
    const existingCart = {
      id: 'cart-1',
      userId,
      restaurantId: 'restaurant-1',
    };

    const product = createProduct({
      price: 30,
      category: {
        restaurantId: 'restaurant-1',
      },
    });

    prismaMock.cart.findUnique
      .mockResolvedValueOnce(existingCart)
      .mockResolvedValueOnce({
        ...existingCart,
        items: [
          {
            productId: 'product-1',
            quantity: 1,
            unitPrice: 30,
            product: {
              id: 'product-1',
              name: 'Produto 1',
              price: 30,
            },
          },
        ],
      });

    productsServiceMock.findAvailableById.mockResolvedValue(product);

    prismaMock.cartItem.findUnique.mockResolvedValue(null);

    prismaMock.cartItem.create.mockResolvedValue({
      id: 'cart-item-1',
      cartId: 'cart-1',
      productId: 'product-1',
      quantity: 1,
      unitPrice: 30,
    });

    const result = await service.addProduct(
      userId,
      'product-1',
      1,
    );

    expect(productsServiceMock.findAvailableById).toHaveBeenCalledWith(
      'product-1',
    );

    expect(prismaMock.cart.create).not.toHaveBeenCalled();

    expect(prismaMock.cartItem.findUnique).toHaveBeenCalledWith({
      where: {
        cartId_productId: {
          cartId: 'cart-1',
          productId: 'product-1',
        },
      },
    });

    expect(prismaMock.cartItem.create).toHaveBeenCalledWith({
      data: {
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 1,
        unitPrice: 30,
      },
    });

    expect(result).toMatchObject({
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      totalAmount: 30,
    });
  });

  it('deve aumentar a quantidade quando o produto já existe no carrinho', async () => {
    const existingCart = {
      id: 'cart-1',
      userId,
      restaurantId: 'restaurant-1',
    };

    const product = createProduct({
      price: 30,
      category: {
        restaurantId: 'restaurant-1',
      },
    });

    prismaMock.cart.findUnique
      .mockResolvedValueOnce(existingCart)
      .mockResolvedValueOnce({
        ...existingCart,
        items: [
          {
            productId: 'product-1',
            quantity: 8,
            unitPrice: 30,
            product: {
              id: 'product-1',
              name: 'Produto 1',
              price: 30,
            },
          },
        ],
      });

    productsServiceMock.findAvailableById.mockResolvedValue(product);

    prismaMock.cartItem.findUnique.mockResolvedValue({
      id: 'cart-item-1',
      cartId: 'cart-1',
      productId: 'product-1',
      quantity: 5,
      unitPrice: 30,
    });

    prismaMock.cartItem.update.mockResolvedValue({
      id: 'cart-item-1',
      cartId: 'cart-1',
      productId: 'product-1',
      quantity: 8,
      unitPrice: 30,
    });

    const result = await service.addProduct(
      userId,
      'product-1',
      3,
    );

    expect(prismaMock.cart.create).not.toHaveBeenCalled();

    expect(prismaMock.cartItem.create).not.toHaveBeenCalled();

    expect(prismaMock.cartItem.update).toHaveBeenCalledWith({
      where: {
        id: 'cart-item-1',
      },
      data: {
        quantity: 8,
      },
    });

    expect(result).toMatchObject({
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      totalAmount: 240,
    });
  });

  it('deve impedir adicionar produto de outro restaurante ao carrinho', async () => {
    const existingCart = {
      id: 'cart-1',
      userId,
      restaurantId: 'restaurant-1',
    };

    const product = createProduct({
      price: 30,
      category: {
        restaurantId: 'restaurant-2',
      },
    });

    prismaMock.cart.findUnique.mockResolvedValue(existingCart);

    productsServiceMock.findAvailableById.mockResolvedValue(product);

    await expect(
      service.addProduct(
        userId,
        'product-1',
        1,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.cart.create).not.toHaveBeenCalled();

    expect(prismaMock.cartItem.findUnique).not.toHaveBeenCalled();

    expect(prismaMock.cartItem.create).not.toHaveBeenCalled();

    expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
  });

  it('deve retornar carrinho vazio quando o usuário não possui carrinho', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(null);

    const result = await service.getCart(userId);

    expect(prismaMock.cart.findUnique).toHaveBeenCalledWith({
      where: {
        userId,
      },
    });

    expect(result).toEqual({
      items: [],
      totalAmount: 0,
    });
  });

  it('deve retornar os itens e o total do carrinho existente', async () => {
    prismaMock.cart.findUnique
      .mockResolvedValueOnce({
        id: 'cart-1',
        userId,
        restaurantId: 'restaurant-1',
      })
      .mockResolvedValueOnce({
        id: 'cart-1',
        userId,
        restaurantId: 'restaurant-1',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 25,
            product: {
              id: 'product-1',
              name: 'Produto 1',
              price: 25,
            },
          },
        ],
      });

    const result = await service.getCart(userId);

    expect(prismaMock.cart.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        userId,
      },
    });

    expect(prismaMock.cart.findUnique).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'cart-1',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    expect(result).toMatchObject({
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      totalAmount: 50,
      items: [
        {
          productId: 'product-1',
          productName: 'Produto 1',
          quantity: 2,
          unitPrice: 25,
          subtotal: 50,
          currentPrice: 25,
          priceChanged: false,
        },
      ],
    });
  });

  it('deve atualizar a quantidade de um item do carrinho', async () => {
    prismaMock.cart.findUnique
      .mockResolvedValueOnce({
        id: 'cart-1',
        userId,
        restaurantId: 'restaurant-1',
      })
      .mockResolvedValueOnce({
        id: 'cart-1',
        userId,
        restaurantId: 'restaurant-1',
        items: [
          {
            productId: 'product-1',
            quantity: 3,
            unitPrice: 25,
            product: {
              id: 'product-1',
              name: 'Produto 1',
              price: 25,
            },
          },
        ],
      });

    prismaMock.cartItem.findFirst.mockResolvedValue({
      id: 'cart-item-1',
      cartId: 'cart-1',
      productId: 'product-1',
      quantity: 1,
      unitPrice: 25,
    });

    prismaMock.cartItem.update.mockResolvedValue({
      id: 'cart-item-1',
      cartId: 'cart-1',
      productId: 'product-1',
      quantity: 3,
      unitPrice: 25,
    });

    const result = await service.updateItemQuantity(
      userId,
      'cart-item-1',
      3,
    );

    expect(prismaMock.cartItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'cart-item-1',
        cartId: 'cart-1',
      },
    });

    expect(prismaMock.cartItem.update).toHaveBeenCalledWith({
      where: {
        id: 'cart-item-1',
      },
      data: {
        quantity: 3,
      },
    });

    expect(result).toMatchObject({
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      totalAmount: 75,
    });
  });

  it('deve lançar NotFoundException quando o item do carrinho não for encontrado', async () => {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      userId,
      restaurantId: 'restaurant-1',
    });

    prismaMock.cartItem.findFirst.mockResolvedValue(null);

    await expect(
      service.updateItemQuantity(userId, 'cart-item-1', 3),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.cartItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'cart-item-1',
        cartId: 'cart-1',
      },
    });
  })

  it('deve remover um item do carrinho', async () => {
    prismaMock.cart.findUnique
      .mockResolvedValueOnce({
        id: 'cart-1',
        userId,
        restaurantId: 'restaurant-1',
      })
      .mockResolvedValueOnce({
        id: 'cart-1',
        userId,
        restaurantId: 'restaurant-1',
        items: [
          {
            productId: 'product-1',
            quantity: 3,
            unitPrice: 25,
            product: {
              id: 'product-1',
              name: 'Produto 1',
              price: 25,
            },
          },
        ],
      });

    prismaMock.cartItem.findFirst.mockResolvedValue({
      id: 'cart-item-1',
      cartId: 'cart-1',
      productId: 'product-1',
      quantity: 1,
      unitPrice: 25,
    });

    prismaMock.cartItem.delete.mockResolvedValue({
      id: 'cart-item-1',
      cartId: 'cart-1',
      productId: 'product-1',
      quantity: 1,
      unitPrice: 25,
    });

    const result = await service.removeCartItem(userId, 'cart-item-1');

    expect(prismaMock.cartItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'cart-item-1',
        cartId: 'cart-1',
      },
    });

    expect(prismaMock.cartItem.delete).toHaveBeenCalledWith({
      where: {
        id: 'cart-item-1',
      },
    });

    expect(result).toMatchObject({
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      totalAmount: 75,
    });
  });

  it('deve lançar NotFoundException quando o item não pertencer ao carrinho do usuário', async () => {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      userId,
      restaurantId: 'restaurant-1',
    });

    prismaMock.cartItem.findFirst.mockResolvedValue(null);

    await expect(
      service.removeCartItem(userId, 'cart-item-1'),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.cart.findUnique).toHaveBeenCalledWith({
      where: {
        userId,
      },
    });

    expect(prismaMock.cartItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'cart-item-1',
        cartId: 'cart-1',
      },
    });
  });

  it('deve lançar NotFoundException quando o carrinho não for encontrado ao remover item', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(null);

    await expect(
      service.removeCartItem(userId, 'cart-item-1'),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.cart.findUnique).toHaveBeenCalledWith({
      where: {
        userId,
      },
    });

    expect(prismaMock.cartItem.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.cartItem.delete).not.toHaveBeenCalled();
  });

  it('deve lançar NotFoundException quando o carrinho não for encontrado ao atualizar quantidade', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(null);

    await expect(
      service.updateItemQuantity(userId, 'cart-item-1', 3),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.cart.findUnique).toHaveBeenCalledWith({
      where: {
        userId,
      },
    });

    expect(prismaMock.cartItem.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando o produto não estiver disponível', async () => {
    productsServiceMock.findAvailableById.mockRejectedValue(
      new NotFoundException('Produto não encontrado ou indisponível.'),
    );

    await expect(
      service.addProduct(userId, 'product-1', 1),
    ).rejects.toThrow(NotFoundException);

    expect(productsServiceMock.findAvailableById).toHaveBeenCalledWith(
      'product-1',
    );

    expect(prismaMock.cart.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.cartItem.create).not.toHaveBeenCalled();
    expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
  });

  it('deve identificar quando o preço de um item do carrinho foi alterado', async () => {
    prismaMock.cart.findUnique
      .mockResolvedValueOnce({
        id: 'cart-1',
        userId,
        restaurantId: 'restaurant-1',
      })
      .mockResolvedValueOnce({
        id: 'cart-1',
        userId,
        restaurantId: 'restaurant-1',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 20,
            product: {
              id: 'product-1',
              name: 'Produto 1',
              price: 25,
            },
          },
        ],
      });

    const result = await service.getCart(userId);

    expect(result).toMatchObject({
      id: 'cart-1',
      restaurantId: 'restaurant-1',
      totalAmount: 40,
      items: [
        {
          productId: 'product-1',
          productName: 'Produto 1',
          quantity: 2,
          unitPrice: 20,
          subtotal: 40,
          currentPrice: 25,
          priceChanged: true,
        },
      ],
    });
  });
});

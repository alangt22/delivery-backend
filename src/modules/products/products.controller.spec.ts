import { Test, TestingModule } from '@nestjs/testing';

import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsServiceMock: any;

  const userId = 'user-1';
  const restaurantId = 'restaurant-1';
  const categoryId = 'category-1';
  const productId = 'product-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    productsServiceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: productsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deve criar um produto', async () => {
    const dto = {
      name: 'Pizza Calabresa',
      description: 'Pizza de calabresa',
      price: 35,
    };

    const result = {
      id: productId,
      ...dto,
      categoryId,
    };

    productsServiceMock.create.mockResolvedValue(result);

    const req = {
      user: {
        id: userId,
      },
    };

    const response = await controller.create(
      restaurantId,
      categoryId,
      req,
      dto,
      undefined,
    );

    expect(productsServiceMock.create).toHaveBeenCalledWith(
      dto,
      categoryId,
      restaurantId,
      userId,
      undefined,
    );

    expect(response).toEqual(result);
  });

  it('deve criar um produto enviando a imagem para o service', async () => {
    const dto = {
      name: 'Pizza Calabresa',
      description: 'Pizza de calabresa',
      price: 35,
    };

    const file = {
      buffer: Buffer.from('fake-image'),
      originalname: 'pizza.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    const result = {
      id: productId,
      ...dto,
      categoryId,
      image: 'https://cloudinary.com/pizza.jpg',
      imagePublicId: 'restaurants/restaurant-1/products/pizza',
    };

    productsServiceMock.create.mockResolvedValue(result);

    const req = {
      user: {
        id: userId,
      },
    };

    const response = await controller.create(
      restaurantId,
      categoryId,
      req,
      dto,
      file,
    );

    expect(productsServiceMock.create).toHaveBeenCalledWith(
      dto,
      categoryId,
      restaurantId,
      userId,
      file,
    );

    expect(response).toEqual(result);
  });

  it('deve buscar todos os produtos da categoria', async () => {
    const products = [
      {
        id: productId,
        name: 'Pizza Calabresa',
        price: 35,
        categoryId,
      },
      {
        id: 'product-2',
        name: 'Pizza Portuguesa',
        price: 40,
        categoryId,
      },
    ];

    productsServiceMock.findAll.mockResolvedValue(products);

    const req = {
      user: {
        id: userId,
      },
    };

    const response = await controller.findAll(
      restaurantId,
      categoryId,
      req,
    );

    expect(productsServiceMock.findAll).toHaveBeenCalledWith(
      categoryId,
      restaurantId,
      userId,
    );

    expect(response).toEqual(products);
  });

  it('deve buscar um produto pelo id', async () => {
    const product = {
      id: productId,
      name: 'Pizza Calabresa',
      price: 35,
      categoryId,
    };

    productsServiceMock.findById.mockResolvedValue(product);

    const req = {
      user: {
        id: userId,
      },
    };

    const response = await controller.findById(
      productId,
      categoryId,
      restaurantId,
      req,
    );

    expect(productsServiceMock.findById).toHaveBeenCalledWith(
      productId,
      categoryId,
      restaurantId,
      userId,
    );

    expect(response).toEqual(product);
  });

  it('deve atualizar um produto', async () => {
    const dto = {
      name: 'Pizza Grande',
      price: 40,
    };

    const updatedProduct = {
      id: productId,
      name: 'Pizza Grande',
      price: 40,
      categoryId,
    };

    productsServiceMock.update.mockResolvedValue(updatedProduct);

    const req = {
      user: {
        id: userId,
      },
    };

    const response = await controller.update(
      productId,
      categoryId,
      restaurantId,
      req,
      dto,
    );

    expect(productsServiceMock.update).toHaveBeenCalledWith(
      productId,
      categoryId,
      restaurantId,
      userId,
      dto,
    );

    expect(response).toEqual(updatedProduct);
  });

  it('deve remover um produto', async () => {
    const result = {
      message: 'Produto removido com sucesso',
    };

    productsServiceMock.remove.mockResolvedValue(result);

    const req = {
      user: {
        id: userId,
      },
    };

    const response = await controller.delete(
      productId,
      categoryId,
      restaurantId,
      req,
    );

    expect(productsServiceMock.remove).toHaveBeenCalledWith(
      productId,
      categoryId,
      restaurantId,
      userId,
    );

    expect(response).toEqual(result);
  });
});
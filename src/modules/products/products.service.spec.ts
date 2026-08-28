import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';


describe('ProductsService', () => {
  let service: ProductsService;
  let prismaMock: any;
  let categoriesServiceMock: any;
  let cloudinaryServiceMock: any;
  const userId = 'user-1';
  const ownerId = 'owner-1';
  const restaurantId = 'restaurant-1';
  const categoryId = 'category-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock = {
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    categoriesServiceMock = {
      findById: jest.fn(),
    };

    cloudinaryServiceMock = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: CategoriesService,
          useValue: categoriesServiceMock,
        },
        {
          provide: CloudinaryService,
          useValue: cloudinaryServiceMock,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('deve criar um produto após validar a categoria', async () => {
    const dto = {
      name: 'Pizza Calabresa',
      description: 'Pizza de calabresa',
      price: 35,
    };

    categoriesServiceMock.findById.mockResolvedValue({
      id: categoryId,
      restaurantId,
    });

    const product = {
      id: 'product-1',
      name: dto.name,
      description: dto.description,
      price: dto.price,
      categoryId,
    };

    prismaMock.product.create.mockResolvedValue(product);

    const result = await service.create(
      dto,
      categoryId,
      restaurantId,
      ownerId,
    );

    expect(categoriesServiceMock.findById).toHaveBeenCalledWith(
      categoryId,
      restaurantId,
      ownerId,
    );

    expect(prismaMock.product.create).toHaveBeenCalledWith({
      data: {
        name: dto.name,
        categoryId,
        description: dto.description,
        price: dto.price,
        image: undefined,
        imagePublicId: undefined,
      },
    });

    expect(result).toEqual(product);
  });

  it('deve criar um produto com imagem enviada para o Cloudinary', async () => {
    const dto = {
      name: 'Pizza Calabresa',
      description: 'Pizza com calabresa',
      price: 35,
    };

    const file = {
      buffer: Buffer.from('fake-image'),
      originalname: 'pizza.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    categoriesServiceMock.findById.mockResolvedValue({
      id: categoryId,
      restaurantId,
    });

    cloudinaryServiceMock.uploadImage.mockResolvedValue({
      url: 'https://cloudinary.com/pizza.jpg',
      publicId: 'restaurants/restaurant-1/products/pizza',
    });

    const product = {
      id: 'product-1',
      name: dto.name,
      description: dto.description,
      price: dto.price,
      categoryId,
      image: 'https://cloudinary.com/pizza.jpg',
      imagePublicId: 'restaurants/restaurant-1/products/pizza',
    };

    prismaMock.product.create.mockResolvedValue(product);

    const result = await service.create(
      dto,
      categoryId,
      restaurantId,
      ownerId,
      file,
    );

    expect(cloudinaryServiceMock.uploadImage).toHaveBeenCalledWith(
      file,
      `restaurants/${restaurantId}/products`,
    );

    expect(prismaMock.product.create).toHaveBeenCalledWith({
      data: {
        name: dto.name,
        categoryId,
        description: dto.description,
        price: dto.price,
        image: 'https://cloudinary.com/pizza.jpg',
        imagePublicId: 'restaurants/restaurant-1/products/pizza',
      },
    });

    expect(result).toEqual(product);
  });

  it('não deve chamar o Cloudinary quando nenhuma imagem for enviada', async () => {
    const dto = {
      name: 'Pizza',
      description: 'Pizza sem imagem',
      price: 30,
    };

    categoriesServiceMock.findById.mockResolvedValue({
      id: categoryId,
      restaurantId,
    });

    const product = {
      id: 'product-1',
      name: dto.name,
      description: dto.description,
      price: dto.price,
      categoryId,
      image: undefined,
      imagePublicId: undefined,
    };

    prismaMock.product.create.mockResolvedValue(product);

    const result = await service.create(
      dto,
      categoryId,
      restaurantId,
      ownerId,
    );

    expect(cloudinaryServiceMock.uploadImage).not.toHaveBeenCalled();

    expect(result).toEqual(product);
  });

  it('deve lançar erro quando a categoria não for válida ao criar produto', async () => {
    categoriesServiceMock.findById.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );

    await expect(
      service.create(
        {
          name: 'Pizza',
          description: 'Pizza de teste',
          price: 30,
        },
        categoryId,
        restaurantId,
        ownerId,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.product.create).not.toHaveBeenCalled();
  });

  it('deve buscar todos os produtos de uma categoria', async () => {
    categoriesServiceMock.findById.mockResolvedValue({
      id: categoryId,
      restaurantId,
    });

    const products = [
      {
        id: 'product-1',
        name: 'Pizza',
        categoryId,
        price: 30,
      },
      {
        id: 'product-2',
        name: 'Hambúrguer',
        categoryId,
        price: 25,
      },
    ];

    prismaMock.product.findMany.mockResolvedValue(products);

    const result = await service.findAll(
      categoryId,
      restaurantId,
      ownerId,
    );

    expect(categoriesServiceMock.findById).toHaveBeenCalledWith(
      categoryId,
      restaurantId,
      ownerId,
    );

    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      where: {
        categoryId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    expect(result).toEqual(products);
  });

  it('deve lançar erro quando a categoria não for válida ao buscar produtos', async () => {
    categoriesServiceMock.findById.mockRejectedValue(
      new NotFoundException('Categoria não encontrada'),
    );

    await expect(
      service.findAll(categoryId, restaurantId, ownerId),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });

  it('deve buscar um produto pelo id', async () => {
    categoriesServiceMock.findById.mockResolvedValue({
      id: categoryId,
      restaurantId,
    });

    const product = {
      id: 'product-1',
      name: 'Pizza Calabresa',
      categoryId,
      price: 35,
    };

    prismaMock.product.findFirst.mockResolvedValue(product);

    const result = await service.findById(
      'product-1',
      categoryId,
      restaurantId,
      ownerId,
    );

    expect(categoriesServiceMock.findById).toHaveBeenCalledWith(
      categoryId,
      restaurantId,
      ownerId,
    );

    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product-1',
        categoryId,
      },
    });

    expect(result).toEqual(product);
  });

  it('deve lançar NotFoundException quando o produto não existir', async () => {
    categoriesServiceMock.findById.mockResolvedValue({
      id: categoryId,
      restaurantId,
    });

    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.findById(
        'product-1',
        categoryId,
        restaurantId,
        ownerId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('deve atualizar um produto existente', async () => {
    const dto = {
      name: 'Pizza Grande',
      price: 40,
    };

    categoriesServiceMock.findById.mockResolvedValue({
      id: categoryId,
      restaurantId,
    });

    prismaMock.product.findFirst.mockResolvedValue({
      id: 'product-1',
      categoryId,
      name: 'Pizza',
      price: 30,
    });

    const updatedProduct = {
      id: 'product-1',
      categoryId,
      name: 'Pizza Grande',
      price: 40,
    };

    prismaMock.product.update.mockResolvedValue(updatedProduct);

    const result = await service.update(
      'product-1',
      categoryId,
      restaurantId,
      ownerId,
      dto,
    );

    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: {
        id: 'product-1',
      },
      data: dto,
    });

    expect(result).toEqual(updatedProduct);
  });

  it('deve remover um produto existente', async () => {
    categoriesServiceMock.findById.mockResolvedValue({
      id: categoryId,
      restaurantId,
    });

    prismaMock.product.findFirst.mockResolvedValue({
      id: 'product-1',
      categoryId,
      name: 'Pizza',
      price: 30,
    });

    prismaMock.product.delete.mockResolvedValue({
      id: 'product-1',
    });

    const result = await service.remove(
      'product-1',
      categoryId,
      restaurantId,
      ownerId,
    );

    expect(prismaMock.product.delete).toHaveBeenCalledWith({
      where: {
        id: 'product-1',
      },
    });

    expect(result).toEqual({
      message: 'Produto removido com sucesso',
    });
  });

  it('deve lançar NotFoundException ao remover produto inexistente', async () => {
    categoriesServiceMock.findById.mockResolvedValue({
      id: categoryId,
      restaurantId,
    });

    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.remove(
        'product-1',
        categoryId,
        restaurantId,
        ownerId,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.product.delete).not.toHaveBeenCalled();
  });

  it('deve buscar produto disponível por id', async () => {
    const product = {
      id: 'product-1',
      name: 'Pizza',
      price: 30,
      isAvailable: true,
      category: {
        id: categoryId,
        restaurantId,
        restaurant: {
          id: restaurantId,
        },
      },
    };

    prismaMock.product.findFirst.mockResolvedValue(product);

    const result = await service.findAvailableById('product-1');

    expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product-1',
      },
      include: {
        category: {
          include: {
            restaurant: true,
          },
        },
      },
    });

    expect(result).toEqual(product);
  });

  it('deve lançar NotFoundException quando o produto não existir em findAvailableById', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(
      service.findAvailableById('product-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('deve lançar BadRequestException quando o produto estiver indisponível', async () => {
    prismaMock.product.findFirst.mockResolvedValue({
      id: 'product-1',
      name: 'Pizza',
      price: 30,
      isAvailable: false,
      category: {
        id: categoryId,
        restaurantId,
        restaurant: {
          id: restaurantId,
        },
      },
    });

    await expect(
      service.findAvailableById('product-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
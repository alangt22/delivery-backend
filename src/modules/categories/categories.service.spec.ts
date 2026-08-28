import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/prisma/prisma.service';
import { RestaurantsService } from 'src/modules/restaurants/restaurants.service';
import { CategoriesService } from 'src/modules/categories/categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaMock: any;
  let restaurantsServiceMock: any;

  const ownerId = 'owner-1';
  const restaurantId = 'restaurant-1';
  const categoryId = 'category-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock = {
      category: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    restaurantsServiceMock = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: RestaurantsService,
          useValue: restaurantsServiceMock,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('deve criar uma categoria após validar o restaurante', async () => {
    const dto = {
      name: 'Pizzas',
    };

    restaurantsServiceMock.findById.mockResolvedValue({
      id: restaurantId,
      ownerId,
    });

    const category = {
      id: categoryId,
      name: dto.name,
      restaurantId,
    };

    prismaMock.category.create.mockResolvedValue(category);

    const result = await service.create(
      dto,
      restaurantId,
      ownerId,
    );

    expect(restaurantsServiceMock.findById).toHaveBeenCalledWith(
      restaurantId,
      ownerId,
    );

    expect(prismaMock.category.create).toHaveBeenCalledWith({
      data: {
        name: dto.name,
        restaurantId,
      },
    });

    expect(result).toEqual(category);
  });

  it('deve impedir criação quando o restaurante não for válido', async () => {
    restaurantsServiceMock.findById.mockRejectedValue(
      new NotFoundException('Restaurante não encontrado'),
    );

    await expect(
      service.create(
        { name: 'Pizzas' },
        restaurantId,
        ownerId,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it('deve buscar todas as categorias do restaurante', async () => {
    restaurantsServiceMock.findById.mockResolvedValue({
      id: restaurantId,
      ownerId,
    });

    const categories = [
      {
        id: 'category-1',
        name: 'Pizzas',
        restaurantId,
      },
      {
        id: 'category-2',
        name: 'Bebidas',
        restaurantId,
      },
    ];

    prismaMock.category.findMany.mockResolvedValue(categories);

    const result = await service.findAllByRestaurant(
      restaurantId,
      ownerId,
    );

    expect(restaurantsServiceMock.findById).toHaveBeenCalledWith(
      restaurantId,
      ownerId,
    );

    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: {
        restaurantId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    expect(result).toEqual(categories);
  });

  it('deve impedir busca quando o restaurante não for válido', async () => {
    restaurantsServiceMock.findById.mockRejectedValue(
      new NotFoundException('Restaurante não encontrado'),
    );

    await expect(
      service.findAllByRestaurant(
        restaurantId,
        ownerId,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.category.findMany).not.toHaveBeenCalled();
  });

  it('deve buscar uma categoria pelo id', async () => {
    restaurantsServiceMock.findById.mockResolvedValue({
      id: restaurantId,
      ownerId,
    });

    const category = {
      id: categoryId,
      name: 'Pizzas',
      restaurantId,
    };

    prismaMock.category.findFirst.mockResolvedValue(category);

    const result = await service.findById(
      categoryId,
      restaurantId,
      ownerId,
    );

    expect(restaurantsServiceMock.findById).toHaveBeenCalledWith(
      restaurantId,
      ownerId,
    );

    expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
      where: {
        id: categoryId,
        restaurantId,
      },
    });

    expect(result).toEqual(category);
  });

  it('deve lançar NotFoundException quando a categoria não existir', async () => {
    restaurantsServiceMock.findById.mockResolvedValue({
      id: restaurantId,
      ownerId,
    });

    prismaMock.category.findFirst.mockResolvedValue(null);

    await expect(
      service.findById(
        categoryId,
        restaurantId,
        ownerId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('deve atualizar uma categoria existente', async () => {
    const dto = {
      name: 'Massas',
    };

    restaurantsServiceMock.findById.mockResolvedValue({
      id: restaurantId,
      ownerId,
    });

    prismaMock.category.findFirst.mockResolvedValue({
      id: categoryId,
      name: 'Pizzas',
      restaurantId,
    });

    const updatedCategory = {
      id: categoryId,
      name: dto.name,
      restaurantId,
    };

    prismaMock.category.update.mockResolvedValue(
      updatedCategory,
    );

    const result = await service.update(
      categoryId,
      restaurantId,
      ownerId,
      dto,
    );

    expect(prismaMock.category.update).toHaveBeenCalledWith({
      where: {
        id: categoryId,
      },
      data: dto,
    });

    expect(result).toEqual(updatedCategory);
  });

  it('deve remover uma categoria existente', async () => {
    restaurantsServiceMock.findById.mockResolvedValue({
      id: restaurantId,
      ownerId,
    });

    prismaMock.category.findFirst.mockResolvedValue({
      id: categoryId,
      name: 'Pizzas',
      restaurantId,
    });

    prismaMock.category.delete.mockResolvedValue({
      id: categoryId,
    });

    const result = await service.remove(
      categoryId,
      restaurantId,
      ownerId,
    );

    expect(prismaMock.category.delete).toHaveBeenCalledWith({
      where: {
        id: categoryId,
      },
    });

    expect(result).toEqual({
      message: 'Categoria removida com sucesso',
    });
  });

  it('deve lançar NotFoundException ao remover categoria inexistente', async () => {
    restaurantsServiceMock.findById.mockResolvedValue({
      id: restaurantId,
      ownerId,
    });

    prismaMock.category.findFirst.mockResolvedValue(null);

    await expect(
      service.remove(
        categoryId,
        restaurantId,
        ownerId,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.category.delete).not.toHaveBeenCalled();
  });
});
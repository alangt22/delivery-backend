import { Test, TestingModule } from '@nestjs/testing';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoriesServiceMock: any;

  const userId = 'user-1';
  const restaurantId = 'restaurant-1';
  const categoryId = 'category-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    categoriesServiceMock = {
      create: jest.fn(),
      findAllByRestaurant: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: categoriesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(
      CategoriesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deve criar uma categoria', async () => {
    const dto = {
      name: 'Pizzas',
    };

    const category = {
      id: categoryId,
      name: 'Pizzas',
      restaurantId,
    };

    categoriesServiceMock.create.mockResolvedValue(category);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.create(
      restaurantId,
      req,
      dto,
    );

    expect(categoriesServiceMock.create).toHaveBeenCalledWith(
      dto,
      restaurantId,
      userId,
    );

    expect(result).toEqual(category);
  });

  it('deve buscar todas as categorias do restaurante', async () => {
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

    categoriesServiceMock.findAllByRestaurant.mockResolvedValue(
      categories,
    );

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.findAll(
      restaurantId,
      req,
    );

    expect(
      categoriesServiceMock.findAllByRestaurant,
    ).toHaveBeenCalledWith(
      restaurantId,
      userId,
    );

    expect(result).toEqual(categories);
  });

  it('deve buscar uma categoria pelo id', async () => {
    const category = {
      id: categoryId,
      name: 'Pizzas',
      restaurantId,
    };

    categoriesServiceMock.findById.mockResolvedValue(category);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.findById(
      restaurantId,
      categoryId,
      req,
    );

    expect(categoriesServiceMock.findById).toHaveBeenCalledWith(
      categoryId,
      restaurantId,
      userId,
    );

    expect(result).toEqual(category);
  });

  it('deve atualizar uma categoria', async () => {
    const dto = {
      name: 'Massas',
    };

    const updatedCategory = {
      id: categoryId,
      name: 'Massas',
      restaurantId,
    };

    categoriesServiceMock.update.mockResolvedValue(
      updatedCategory,
    );

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.update(
      restaurantId,
      categoryId,
      req,
      dto,
    );

    expect(categoriesServiceMock.update).toHaveBeenCalledWith(
      categoryId,
      restaurantId,
      userId,
      dto,
    );

    expect(result).toEqual(updatedCategory);
  });

  it('deve remover uma categoria', async () => {
    const response = {
      message: 'Categoria removida com sucesso',
    };

    categoriesServiceMock.remove.mockResolvedValue(response);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.remove(
      restaurantId,
      categoryId,
      req,
    );

    expect(categoriesServiceMock.remove).toHaveBeenCalledWith(
      categoryId,
      restaurantId,
      userId,
    );

    expect(result).toEqual(response);
  });
});
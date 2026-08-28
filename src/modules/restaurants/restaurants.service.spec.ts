import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantsService } from 'src/modules/restaurants/restaurants.service';

import { PrismaService } from 'src/prisma/prisma.service';


describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let prismaMock: any;

  const ownerId = 'owner-1';
  const restaurantId = 'restaurant-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock = {
      restaurant: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<RestaurantsService>(RestaurantsService);
  });

  it('deve criar um restaurante', async () => {
    const dto = {
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
    };

    const restaurant = {
      id: restaurantId,
      name: dto.name,
      description: dto.description,
      ownerId,
    };

    prismaMock.restaurant.create.mockResolvedValue(restaurant);

    const result = await service.create(dto, ownerId);

    expect(prismaMock.restaurant.create).toHaveBeenCalledWith({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId,
      },
    });

    expect(result).toEqual(restaurant);
  });

  it('deve buscar todos os restaurantes do proprietário', async () => {
    const restaurants = [
      {
        id: 'restaurant-1',
        name: 'Alan Burger',
        description: 'Hambúrguer artesanal',
        ownerId,
      },
      {
        id: 'restaurant-2',
        name: 'Alan Pizza',
        description: 'Pizzas artesanais',
        ownerId,
      },
    ];

    prismaMock.restaurant.findMany.mockResolvedValue(restaurants);

    const result = await service.findAllByOwner(ownerId);

    expect(prismaMock.restaurant.findMany).toHaveBeenCalledWith({
      where: {
        ownerId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(result).toEqual(restaurants);
  });

  it('deve buscar um restaurante pelo id', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);

    const result = await service.findById(
      restaurantId,
      ownerId,
    );

    expect(prismaMock.restaurant.findFirst).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
        ownerId,
      },
    });

    expect(result).toEqual(restaurant);
  });

  it('deve lançar NotFoundException quando o restaurante não existir', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(null);

    await expect(
      service.findById(
        restaurantId,
        ownerId,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.restaurant.findFirst).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
        ownerId,
      },
    });
  });

  it('deve atualizar um restaurante existente', async () => {
    const dto = {
      name: 'Alan Burger Atualizado',
      description: 'Novo cardápio',
    };

    const existingRestaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
    };

    const updatedRestaurant = {
      ...existingRestaurant,
      ...dto,
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(
      existingRestaurant,
    );

    prismaMock.restaurant.update.mockResolvedValue(
      updatedRestaurant,
    );

    const result = await service.update(
      restaurantId,
      ownerId,
      dto,
    );

    expect(prismaMock.restaurant.findFirst).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
        ownerId,
      },
    });

    expect(prismaMock.restaurant.update).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
      data: dto,
    });

    expect(result).toEqual(updatedRestaurant);
  });

  it('deve impedir atualização de restaurante inexistente', async () => {
    const dto = {
      name: 'Novo nome',
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        restaurantId,
        ownerId,
        dto,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.restaurant.update).not.toHaveBeenCalled();
  });

  it('deve remover um restaurante existente', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);

    prismaMock.restaurant.delete.mockResolvedValue(restaurant);

    const result = await service.remove(
      restaurantId,
      ownerId,
    );

    expect(prismaMock.restaurant.findFirst).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
        ownerId,
      },
    });

    expect(prismaMock.restaurant.delete).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
    });

    expect(result).toEqual({
      message: 'Restaurante removido com sucesso',
    });
  });

  it('deve impedir remoção de restaurante inexistente', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(null);

    await expect(
      service.remove(
        restaurantId,
        ownerId,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.restaurant.delete).not.toHaveBeenCalled();
  });
});
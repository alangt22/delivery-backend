import { Test, TestingModule } from '@nestjs/testing';

import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';

describe('RestaurantsController', () => {
  let controller: RestaurantsController;
  let restaurantsServiceMock: any;

  const userId = 'user-1';
  const restaurantId = 'restaurant-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    restaurantsServiceMock = {
      create: jest.fn(),
      findAllByOwner: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RestaurantsController],
      providers: [
        {
          provide: RestaurantsService,
          useValue: restaurantsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<RestaurantsController>(
      RestaurantsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
      ownerId: userId,
    };

    restaurantsServiceMock.create.mockResolvedValue(restaurant);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.create(req, dto);

    expect(restaurantsServiceMock.create).toHaveBeenCalledWith(
      dto,
      userId,
    );

    expect(result).toEqual(restaurant);
  });

  it('deve buscar os restaurantes do proprietário', async () => {
    const restaurants = [
      {
        id: 'restaurant-1',
        name: 'Alan Burger',
        description: 'Hambúrguer artesanal',
        ownerId: userId,
      },
      {
        id: 'restaurant-2',
        name: 'Alan Pizza',
        description: 'Pizzas artesanais',
        ownerId: userId,
      },
    ];

    restaurantsServiceMock.findAllByOwner.mockResolvedValue(
      restaurants,
    );

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.findAll(req);

    expect(
      restaurantsServiceMock.findAllByOwner,
    ).toHaveBeenCalledWith(userId);

    expect(result).toEqual(restaurants);
  });

  it('deve buscar um restaurante pelo id', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId: userId,
    };

    restaurantsServiceMock.findById.mockResolvedValue(restaurant);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.findById(
      restaurantId,
      req,
    );

    expect(restaurantsServiceMock.findById).toHaveBeenCalledWith(
      restaurantId,
      userId,
    );

    expect(result).toEqual(restaurant);
  });

  it('deve atualizar um restaurante', async () => {
    const dto = {
      name: 'Alan Burger Atualizado',
      description: 'Novo cardápio',
    };

    const restaurant = {
      id: restaurantId,
      name: dto.name,
      description: dto.description,
      ownerId: userId,
    };

    restaurantsServiceMock.update.mockResolvedValue(restaurant);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.update(
      restaurantId,
      req,
      dto,
      {
        logo: undefined,
        banner: undefined,
      },
    );

    expect(restaurantsServiceMock.update).toHaveBeenCalledWith(
      restaurantId,
      userId,
      dto,
      undefined,
      undefined,
    );

    expect(result).toEqual(restaurant);
  });

  it('deve atualizar um restaurante enviando logo e banner', async () => {
    const dto = {
      name: 'Alan Burger Atualizado',
    };

    const logo = {
      buffer: Buffer.from('logo'),
      originalname: 'logo.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    const banner = {
      buffer: Buffer.from('banner'),
      originalname: 'banner.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    const restaurant = {
      id: restaurantId,
      name: dto.name,
      ownerId: userId,
      logo: 'https://cloudinary.com/logo.png',
      banner: 'https://cloudinary.com/banner.jpg',
    };

    restaurantsServiceMock.update.mockResolvedValue(restaurant);

    const req = {
      user: {
        id: userId,
      },
    };

    const files = {
      logo: [logo],
      banner: [banner],
    };

    const result = await controller.update(
      restaurantId,
      req,
      dto,
      files,
    );

    expect(restaurantsServiceMock.update).toHaveBeenCalledWith(
      restaurantId,
      userId,
      dto,
      logo,
      banner,
    );

    expect(result).toEqual(restaurant);
  });

  it('deve remover um restaurante', async () => {
    const response = {
      message: 'Restaurante removido com sucesso',
    };

    restaurantsServiceMock.remove.mockResolvedValue(response);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.delete(
      restaurantId,
      req,
    );

    expect(restaurantsServiceMock.remove).toHaveBeenCalledWith(
      restaurantId,
      userId,
    );

    expect(result).toEqual(response);
  });
});
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantsService } from 'src/modules/restaurants/restaurants.service';

import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';


describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let prismaMock: any;
  let cloudinaryServiceMock: any;


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

      order: {
        count: jest.fn(),
      },

      cart: {
        count: jest.fn(),
      },

      category: {
        count: jest.fn(),
      },
    };

    cloudinaryServiceMock = {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: CloudinaryService,
          useValue: cloudinaryServiceMock,
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

  it('deve atualizar um restaurante com uma nova logo', async () => {
    const dto = {
      name: 'Alan Burger',
    };

    const logo = {
      buffer: Buffer.from('new-logo'),
      originalname: 'logo.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    const existingRestaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
      logo: 'https://cloudinary.com/old-logo.png',
      logoPublicId: 'restaurants/restaurant-1/logo/old-logo',
      banner: null,
      bannerPublicId: null,
    };

    const uploadedLogo = {
      url: 'https://cloudinary.com/new-logo.png',
      publicId: 'restaurants/restaurant-1/logo/new-logo',
    };

    const updatedRestaurant = {
      ...existingRestaurant,
      ...dto,
      logo: uploadedLogo.url,
      logoPublicId: uploadedLogo.publicId,
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(
      existingRestaurant,
    );

    cloudinaryServiceMock.uploadImage.mockResolvedValue(uploadedLogo);

    prismaMock.restaurant.update.mockResolvedValue(
      updatedRestaurant,
    );

    const result = await service.update(
      restaurantId,
      ownerId,
      dto,
      logo,
    );

    expect(cloudinaryServiceMock.uploadImage).toHaveBeenCalledWith(
      logo,
      `restaurants/${restaurantId}/logo`,
    );

    expect(prismaMock.restaurant.update).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
      data: {
        ...dto,
        logo: uploadedLogo.url,
        logoPublicId: uploadedLogo.publicId,
        banner: undefined,
        bannerPublicId: undefined,
      },
    });

    expect(cloudinaryServiceMock.deleteImage).toHaveBeenCalledWith(
      existingRestaurant.logoPublicId,
    );

    expect(result).toEqual(updatedRestaurant);
  });

  it('deve atualizar um restaurante com um novo banner', async () => {
    const dto = {
      description: 'Novo cardápio',
    };

    const banner = {
      buffer: Buffer.from('new-banner'),
      originalname: 'banner.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    const existingRestaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
      logo: null,
      logoPublicId: null,
      banner: 'https://cloudinary.com/old-banner.jpg',
      bannerPublicId: 'restaurants/restaurant-1/banner/old-banner',
    };

    const uploadedBanner = {
      url: 'https://cloudinary.com/new-banner.jpg',
      publicId: 'restaurants/restaurant-1/banner/new-banner',
    };

    const updatedRestaurant = {
      ...existingRestaurant,
      ...dto,
      banner: uploadedBanner.url,
      bannerPublicId: uploadedBanner.publicId,
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(
      existingRestaurant,
    );

    cloudinaryServiceMock.uploadImage.mockResolvedValue(
      uploadedBanner,
    );

    prismaMock.restaurant.update.mockResolvedValue(
      updatedRestaurant,
    );

    const result = await service.update(
      restaurantId,
      ownerId,
      dto,
      undefined,
      banner,
    );

    expect(cloudinaryServiceMock.uploadImage).toHaveBeenCalledWith(
      banner,
      `restaurants/${restaurantId}/banner`,
    );

    expect(prismaMock.restaurant.update).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
      data: {
        ...dto,
        logo: undefined,
        logoPublicId: undefined,
        banner: uploadedBanner.url,
        bannerPublicId: uploadedBanner.publicId,
      },
    });

    expect(cloudinaryServiceMock.deleteImage).toHaveBeenCalledWith(
      existingRestaurant.bannerPublicId,
    );

    expect(result).toEqual(updatedRestaurant);
  });

  it('deve atualizar um restaurante com nova logo e novo banner', async () => {
    const dto = {
      name: 'Alan Burger Atualizado',
    };

    const logo = {
      buffer: Buffer.from('new-logo'),
      originalname: 'logo.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    const banner = {
      buffer: Buffer.from('new-banner'),
      originalname: 'banner.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    const existingRestaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
      logo: 'https://cloudinary.com/old-logo.png',
      logoPublicId: 'restaurants/restaurant-1/logo/old-logo',
      banner: 'https://cloudinary.com/old-banner.jpg',
      bannerPublicId: 'restaurants/restaurant-1/banner/old-banner',
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(
      existingRestaurant,
    );

    cloudinaryServiceMock.uploadImage
      .mockResolvedValueOnce({
        url: 'https://cloudinary.com/new-logo.png',
        publicId: 'restaurants/restaurant-1/logo/new-logo',
      })
      .mockResolvedValueOnce({
        url: 'https://cloudinary.com/new-banner.jpg',
        publicId: 'restaurants/restaurant-1/banner/new-banner',
      });

    const updatedRestaurant = {
      ...existingRestaurant,
      ...dto,
      logo: 'https://cloudinary.com/new-logo.png',
      logoPublicId: 'restaurants/restaurant-1/logo/new-logo',
      banner: 'https://cloudinary.com/new-banner.jpg',
      bannerPublicId: 'restaurants/restaurant-1/banner/new-banner',
    };

    prismaMock.restaurant.update.mockResolvedValue(
      updatedRestaurant,
    );

    const result = await service.update(
      restaurantId,
      ownerId,
      dto,
      logo,
      banner,
    );

    expect(cloudinaryServiceMock.uploadImage).toHaveBeenNthCalledWith(
      1,
      logo,
      `restaurants/${restaurantId}/logo`,
    );

    expect(cloudinaryServiceMock.uploadImage).toHaveBeenNthCalledWith(
      2,
      banner,
      `restaurants/${restaurantId}/banner`,
    );

    expect(prismaMock.restaurant.update).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
      data: {
        ...dto,
        logo: 'https://cloudinary.com/new-logo.png',
        logoPublicId: 'restaurants/restaurant-1/logo/new-logo',
        banner: 'https://cloudinary.com/new-banner.jpg',
        bannerPublicId: 'restaurants/restaurant-1/banner/new-banner',
      },
    });

    expect(cloudinaryServiceMock.deleteImage).toHaveBeenNthCalledWith(
      1,
      'restaurants/restaurant-1/logo/old-logo',
    );

    expect(cloudinaryServiceMock.deleteImage).toHaveBeenNthCalledWith(
      2,
      'restaurants/restaurant-1/banner/old-banner',
    );

    expect(result).toEqual(updatedRestaurant);
  });

  it('deve interromper a atualização quando o upload da imagem falhar', async () => {
    const dto = {
      name: 'Alan Burger Atualizado',
    };

    const logo = {
      buffer: Buffer.from('new-logo'),
      originalname: 'logo.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    const existingRestaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
      logo: 'https://cloudinary.com/old-logo.png',
      logoPublicId: 'restaurants/restaurant-1/logo/old-logo',
      banner: null,
      bannerPublicId: null,
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(
      existingRestaurant,
    );

    cloudinaryServiceMock.uploadImage.mockRejectedValue(
      new Error('Erro no Cloudinary'),
    );

    await expect(
      service.update(
        restaurantId,
        ownerId,
        dto,
        logo,
      ),
    ).rejects.toThrow('Erro no Cloudinary');

    expect(prismaMock.restaurant.update).not.toHaveBeenCalled();

    expect(cloudinaryServiceMock.deleteImage).not.toHaveBeenCalled();
  });

  it('deve remover a nova imagem do Cloudinary quando a atualização do banco falhar', async () => {
    const dto = {
      name: 'Alan Burger Atualizado',
    };

    const logo = {
      buffer: Buffer.from('new-logo'),
      originalname: 'logo.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    const existingRestaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
      logo: 'old-logo.jpg',
      logoPublicId: 'restaurants/restaurant-1/logo/old-logo',
      banner: null,
      bannerPublicId: null,
    };

    const uploadedLogo = {
      url: 'new-logo.jpg',
      publicId: 'restaurants/restaurant-1/logo/new-logo',
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(
      existingRestaurant,
    );

    cloudinaryServiceMock.uploadImage.mockResolvedValue(
      uploadedLogo,
    );

    prismaMock.restaurant.update.mockRejectedValue(
      new Error('Erro no banco'),
    );

    await expect(
      service.update(
        restaurantId,
        ownerId,
        dto,
        logo,
      ),
    ).rejects.toThrow('Erro no banco');

    expect(
      cloudinaryServiceMock.deleteImage,
    ).toHaveBeenCalledWith(
      uploadedLogo.publicId,
    );
  });

  it('deve compensar a logo quando o upload do banner falhar', async () => {
    const dto = {
      name: 'Alan Burger Atualizado',
    };

    const logo = {
      buffer: Buffer.from('new-logo'),
      originalname: 'logo.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    const banner = {
      buffer: Buffer.from('new-banner'),
      originalname: 'banner.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    const existingRestaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
      logo: 'old-logo.jpg',
      logoPublicId: 'restaurants/restaurant-1/logo/old-logo',
      banner: 'old-banner.jpg',
      bannerPublicId: 'restaurants/restaurant-1/banner/old-banner',
    };

    const uploadedLogo = {
      url: 'new-logo.jpg',
      publicId: 'restaurants/restaurant-1/logo/new-logo',
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(
      existingRestaurant,
    );

    cloudinaryServiceMock.uploadImage
      .mockResolvedValueOnce(uploadedLogo)
      .mockRejectedValueOnce(new Error('Erro no upload do banner'));

    await expect(
      service.update(
        restaurantId,
        ownerId,
        dto,
        logo,
        banner,
      ),
    ).rejects.toThrow('Erro no upload do banner');

    expect(
      cloudinaryServiceMock.deleteImage,
    ).toHaveBeenCalledWith(
      uploadedLogo.publicId,
    );

    expect(prismaMock.restaurant.update).not.toHaveBeenCalled();
  });

  it('deve manter a atualização quando a remoção da logo antiga falhar', async () => {
    const dto = {
      name: 'Alan Burger Atualizado',
    };

    const logo = {
      buffer: Buffer.from('new-logo'),
      originalname: 'logo.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    const existingRestaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
      logo: 'old-logo.jpg',
      logoPublicId: 'restaurants/restaurant-1/logo/old-logo',
      banner: null,
      bannerPublicId: null,
    };

    const uploadedLogo = {
      url: 'new-logo.jpg',
      publicId: 'restaurants/restaurant-1/logo/new-logo',
    };

    const updatedRestaurant = {
      ...existingRestaurant,
      ...dto,
      logo: uploadedLogo.url,
      logoPublicId: uploadedLogo.publicId,
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(
      existingRestaurant,
    );

    cloudinaryServiceMock.uploadImage.mockResolvedValue(
      uploadedLogo,
    );

    prismaMock.restaurant.update.mockResolvedValue(
      updatedRestaurant,
    );

    cloudinaryServiceMock.deleteImage.mockRejectedValue(
      new Error('Erro ao remover imagem antiga'),
    );

    const result = await service.update(
      restaurantId,
      ownerId,
      dto,
      logo,
    );

    expect(result).toEqual(updatedRestaurant);

    expect(
      cloudinaryServiceMock.deleteImage,
    ).toHaveBeenCalledWith(
      existingRestaurant.logoPublicId,
    );
  });

  it('deve manter a remoção do restaurante quando a exclusão das imagens falhar', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
      logo: 'logo.jpg',
      logoPublicId: 'restaurants/restaurant-1/logo/logo',
      banner: 'banner.jpg',
      bannerPublicId: 'restaurants/restaurant-1/banner/banner',
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);

    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.cart.count.mockResolvedValue(0);
    prismaMock.category.count.mockResolvedValue(0);

    prismaMock.restaurant.delete.mockResolvedValue(restaurant);

    cloudinaryServiceMock.deleteImage
      .mockRejectedValueOnce(new Error('Erro ao remover logo'))
      .mockRejectedValueOnce(new Error('Erro ao remover banner'));

    const result = await service.remove(
      restaurantId,
      ownerId,
    );

    expect(prismaMock.restaurant.delete).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
    });

    expect(
      cloudinaryServiceMock.deleteImage,
    ).toHaveBeenNthCalledWith(
      1,
      restaurant.logoPublicId,
    );

    expect(
      cloudinaryServiceMock.deleteImage,
    ).toHaveBeenNthCalledWith(
      2,
      restaurant.bannerPublicId,
    );

    expect(result).toEqual({
      message: 'Restaurante removido com sucesso',
    });
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

    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.cart.count.mockResolvedValue(0);
    prismaMock.category.count.mockResolvedValue(0);

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

  it('deve remover logo e banner do Cloudinary ao remover um restaurante', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
      logo: 'https://cloudinary.com/logo.jpg',
      logoPublicId: 'restaurants/restaurant-1/logo/logo',
      banner: 'https://cloudinary.com/banner.jpg',
      bannerPublicId: 'restaurants/restaurant-1/banner/banner',
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);

    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.cart.count.mockResolvedValue(0);
    prismaMock.category.count.mockResolvedValue(0);

    prismaMock.restaurant.delete.mockResolvedValue(restaurant);

    const result = await service.remove(
      restaurantId,
      ownerId,
    );

    expect(prismaMock.restaurant.delete).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
    });

    expect(cloudinaryServiceMock.deleteImage).toHaveBeenNthCalledWith(
      1,
      restaurant.logoPublicId,
    );

    expect(cloudinaryServiceMock.deleteImage).toHaveBeenNthCalledWith(
      2,
      restaurant.bannerPublicId,
    );

    expect(result).toEqual({
      message: 'Restaurante removido com sucesso',
    });
  });

  it('deve remover um restaurante sem tentar remover imagens do Cloudinary', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      ownerId,
      logo: null,
      logoPublicId: null,
      banner: null,
      bannerPublicId: null,
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);

    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.cart.count.mockResolvedValue(0);
    prismaMock.category.count.mockResolvedValue(0);

    prismaMock.restaurant.delete.mockResolvedValue(restaurant);

    const result = await service.remove(
      restaurantId,
      ownerId,
    );

    expect(prismaMock.restaurant.delete).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
    });

    expect(cloudinaryServiceMock.deleteImage).not.toHaveBeenCalled();

    expect(result).toEqual({
      message: 'Restaurante removido com sucesso',
    });
  });

  it('deve impedir remoção quando existem pedidos associados', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      ownerId,
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);

    prismaMock.order.count.mockResolvedValue(1);
    prismaMock.cart.count.mockResolvedValue(0);
    prismaMock.category.count.mockResolvedValue(0);

    await expect(
      service.remove(restaurantId, ownerId),
    ).rejects.toThrow('Não é possível remover o restaurante');

    expect(prismaMock.restaurant.delete).not.toHaveBeenCalled();
  });

  it('deve impedir remoção quando existem carrinhos associados', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      ownerId,
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);

    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.cart.count.mockResolvedValue(1);
    prismaMock.category.count.mockResolvedValue(0);

    await expect(
      service.remove(restaurantId, ownerId),
    ).rejects.toThrow('Não é possível remover o restaurante');

    expect(prismaMock.restaurant.delete).not.toHaveBeenCalled();
  });

  it('deve impedir remoção quando existem categorias associadas', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      ownerId,
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);

    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.cart.count.mockResolvedValue(0);
    prismaMock.category.count.mockResolvedValue(1);

    await expect(
      service.remove(restaurantId, ownerId),
    ).rejects.toThrow('Não é possível remover o restaurante');

    expect(prismaMock.restaurant.delete).not.toHaveBeenCalled();
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

  it('deve retornar apenas restaurantes aprovados para a vitrine pública', async () => {
    const restaurants = [
      {
        id: restaurantId,
        name: 'Alan Burger',
        description: 'Hambúrguer artesanal',
        logo: 'logo.jpg',
        banner: 'banner.jpg',
        status: 'APPROVED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    prismaMock.restaurant.findMany.mockResolvedValue(restaurants);

    const result = await service.findPublicAll();

    expect(prismaMock.restaurant.findMany).toHaveBeenCalledWith({
      where: {
        status: 'APPROVED',
      },
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        banner: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(result).toEqual(restaurants);
  });

  it('deve buscar um restaurante aprovado para a vitrine pública', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      description: 'Hambúrguer artesanal',
      logo: 'logo.jpg',
      banner: 'banner.jpg',
      status: 'APPROVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);

    const result = await service.findPublicById(restaurantId);

    expect(prismaMock.restaurant.findFirst).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
        status: 'APPROVED',
      },
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        banner: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    expect(result).toEqual(restaurant);
  });

  it('deve lançar NotFoundException para restaurante inexistente ou não aprovado', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(null);

    await expect(
      service.findPublicById(restaurantId),
    ).rejects.toThrow(NotFoundException);
  });

  it('deve retornar apenas restaurantes pendentes', async () => {
    const pendingRestaurants = [
      {
        id: 'restaurant-1',
        name: 'Alan Burger',
        status: 'PENDING',
        ownerId: 'owner-1',
      },
      {
        id: 'restaurant-2',
        name: 'Alan Pizza',
        status: 'PENDING',
        ownerId: 'owner-2',
      },
    ];

    prismaMock.restaurant.findMany.mockResolvedValue(
      pendingRestaurants,
    );

    const result = await service.findPending();

    expect(prismaMock.restaurant.findMany).toHaveBeenCalledWith({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    expect(result).toEqual(pendingRestaurants);
  });

  it('deve aprovar um restaurante pendente', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      status: 'PENDING',
      ownerId,
    };

    const approvedRestaurant = {
      ...restaurant,
      status: 'APPROVED',
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);
    prismaMock.restaurant.update.mockResolvedValue(
      approvedRestaurant,
    );

    const result = await service.approve(restaurantId);

    expect(prismaMock.restaurant.findFirst).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
        status: 'PENDING',
      },
    });

    expect(prismaMock.restaurant.update).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
      data: {
        status: 'APPROVED',
      },
    });

    expect(result).toEqual(approvedRestaurant);
  });

  it('deve impedir aprovação de restaurante inexistente ou já processado', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(null);

    await expect(
      service.approve(restaurantId),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.restaurant.update).not.toHaveBeenCalled();
  });

  it('deve rejeitar um restaurante pendente', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      status: 'PENDING',
    };

    const rejectedRestaurant = {
      ...restaurant,
      status: 'REJECTED',
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);
    prismaMock.restaurant.update.mockResolvedValue(
      rejectedRestaurant,
    );

    const result = await service.reject(restaurantId);

    expect(
      prismaMock.restaurant.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
        status: 'PENDING',
      },
    });

    expect(
      prismaMock.restaurant.update,
    ).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
      data: {
        status: 'REJECTED',
      },
    });

    expect(result).toEqual(rejectedRestaurant);
  });

  it('deve suspender um restaurante aprovado', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      status: 'APPROVED',
    };

    const suspendedRestaurant = {
      ...restaurant,
      status: 'SUSPENDED',
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);
    prismaMock.restaurant.update.mockResolvedValue(
      suspendedRestaurant,
    );

    const result = await service.suspend(restaurantId);

    expect(
      prismaMock.restaurant.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
        status: 'APPROVED',
      },
    });

    expect(
      prismaMock.restaurant.update,
    ).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
      data: {
        status: 'SUSPENDED',
      },
    });

    expect(result).toEqual(suspendedRestaurant);
  });

  it('deve reativar um restaurante suspenso', async () => {
    const restaurant = {
      id: restaurantId,
      name: 'Alan Burger',
      status: 'SUSPENDED',
    };

    const reactivatedRestaurant = {
      ...restaurant,
      status: 'APPROVED',
    };

    prismaMock.restaurant.findFirst.mockResolvedValue(restaurant);
    prismaMock.restaurant.update.mockResolvedValue(
      reactivatedRestaurant,
    );

    const result = await service.reactivate(restaurantId);

    expect(
      prismaMock.restaurant.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
        status: 'SUSPENDED',
      },
    });

    expect(
      prismaMock.restaurant.update,
    ).toHaveBeenCalledWith({
      where: {
        id: restaurantId,
      },
      data: {
        status: 'APPROVED',
      },
    });

    expect(result).toEqual(reactivatedRestaurant);
  });

  it('deve impedir rejeição de restaurante inexistente ou já processado', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(null);

    await expect(
      service.reject(restaurantId),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.restaurant.update).not.toHaveBeenCalled();
  });

  it('deve impedir suspensão de restaurante inexistente ou não aprovado', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(null);

    await expect(
      service.suspend(restaurantId),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.restaurant.update).not.toHaveBeenCalled();
  });

  it('deve impedir reativação de restaurante inexistente ou não suspenso', async () => {
    prismaMock.restaurant.findFirst.mockResolvedValue(null);

    await expect(
      service.reactivate(restaurantId),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.restaurant.update).not.toHaveBeenCalled();
  });
});
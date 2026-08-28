import { Test, TestingModule } from '@nestjs/testing';

import { AddressesController } from './address.controller';
import { AddressesService } from './address.service';

describe('AddressesController', () => {
  let controller: AddressesController;
  let addressesServiceMock: any;

  const userId = 'user-1';
  const addressId = 'address-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    addressesServiceMock = {
      create: jest.fn(),
      findAllByUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [
        {
          provide: AddressesService,
          useValue: addressesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AddressesController>(
      AddressesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deve criar um endereço para o usuário', async () => {
    const dto = {
      street: 'Rua A',
      number: '100',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000',
    };

    const address = {
      id: addressId,
      ...dto,
      userId,
    };

    addressesServiceMock.create.mockResolvedValue(address);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.create(req, dto);

    expect(addressesServiceMock.create).toHaveBeenCalledWith(
      dto,
      userId,
    );

    expect(result).toEqual(address);
  });

  it('deve buscar todos os endereços do usuário', async () => {
    const addresses = [
      {
        id: 'address-1',
        street: 'Rua A',
        number: '100',
        userId,
      },
      {
        id: 'address-2',
        street: 'Rua B',
        number: '200',
        userId,
      },
    ];

    addressesServiceMock.findAllByUser.mockResolvedValue(addresses);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.findAll(req);

    expect(
      addressesServiceMock.findAllByUser,
    ).toHaveBeenCalledWith(userId);

    expect(result).toEqual(addresses);
  });

  it('deve buscar um endereço pelo id', async () => {
    const address = {
      id: addressId,
      street: 'Rua A',
      number: '100',
      userId,
    };

    addressesServiceMock.findById.mockResolvedValue(address);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.findById(
      addressId,
      req,
    );

    expect(addressesServiceMock.findById).toHaveBeenCalledWith(
      addressId,
      userId,
    );

    expect(result).toEqual(address);
  });

  it('deve atualizar um endereço', async () => {
    const dto = {
      street: 'Rua Nova',
      number: '200',
    };

    const updatedAddress = {
      id: addressId,
      street: 'Rua Nova',
      number: '200',
      userId,
    };

    addressesServiceMock.update.mockResolvedValue(
      updatedAddress,
    );

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.update(
      addressId,
      req,
      dto,
    );

    expect(addressesServiceMock.update).toHaveBeenCalledWith(
      addressId,
      userId,
      dto,
    );

    expect(result).toEqual(updatedAddress);
  });

  it('deve remover um endereço', async () => {
    const response = {
      message: 'Endereço removido com sucesso',
    };

    addressesServiceMock.remove.mockResolvedValue(response);

    const req = {
      user: {
        id: userId,
      },
    };

    const result = await controller.delete(
      addressId,
      req,
    );

    expect(addressesServiceMock.remove).toHaveBeenCalledWith(
      addressId,
      userId,
    );

    expect(result).toEqual(response);
  });
});
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/prisma/prisma.service';
import { AddressesService } from './address.service';

describe('AddressesService', () => {
  let service: AddressesService;
  let prismaMock: any;

  const userId = 'user-1';
  const addressId = 'address-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock = {
      address: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);
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

    prismaMock.address.create.mockResolvedValue(address);

    const result = await service.create(dto, userId);

    expect(prismaMock.address.create).toHaveBeenCalledWith({
      data: {
        ...dto,
        userId,
      },
    });

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

    prismaMock.address.findMany.mockResolvedValue(addresses);

    const result = await service.findAllByUser(userId);

    expect(prismaMock.address.findMany).toHaveBeenCalledWith({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(result).toEqual(addresses);
  });

  it('deve buscar um endereço pelo id pertencente ao usuário', async () => {
    const address = {
      id: addressId,
      street: 'Rua A',
      number: '100',
      userId,
    };

    prismaMock.address.findFirst.mockResolvedValue(address);

    const result = await service.findById(
      addressId,
      userId,
    );

    expect(prismaMock.address.findFirst).toHaveBeenCalledWith({
      where: {
        id: addressId,
        userId,
      },
    });

    expect(result).toEqual(address);
  });

  it('deve lançar NotFoundException quando o endereço não existir', async () => {
    prismaMock.address.findFirst.mockResolvedValue(null);

    await expect(
      service.findById(
        addressId,
        userId,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.address.findFirst).toHaveBeenCalledWith({
      where: {
        id: addressId,
        userId,
      },
    });
  });

  it('deve atualizar um endereço existente', async () => {
    const dto = {
      street: 'Rua Nova',
      number: '200',
    };

    const address = {
      id: addressId,
      street: 'Rua A',
      number: '100',
      userId,
    };

    const updatedAddress = {
      ...address,
      ...dto,
    };

    prismaMock.address.findFirst.mockResolvedValue(address);
    prismaMock.address.update.mockResolvedValue(updatedAddress);

    const result = await service.update(
      addressId,
      userId,
      dto,
    );

    expect(prismaMock.address.findFirst).toHaveBeenCalledWith({
      where: {
        id: addressId,
        userId,
      },
    });

    expect(prismaMock.address.update).toHaveBeenCalledWith({
      where: {
        id: addressId,
      },
      data: dto,
    });

    expect(result).toEqual(updatedAddress);
  });

  it('deve impedir atualização de endereço inexistente', async () => {
    const dto = {
      street: 'Rua Nova',
    };

    prismaMock.address.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        addressId,
        userId,
        dto,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.address.update).not.toHaveBeenCalled();
  });

  it('deve remover um endereço existente', async () => {
    const address = {
      id: addressId,
      street: 'Rua A',
      number: '100',
      userId,
    };

    prismaMock.address.findFirst.mockResolvedValue(address);

    prismaMock.address.delete.mockResolvedValue(address);

    const result = await service.remove(
      addressId,
      userId,
    );

    expect(prismaMock.address.findFirst).toHaveBeenCalledWith({
      where: {
        id: addressId,
        userId,
      },
    });

    expect(prismaMock.address.delete).toHaveBeenCalledWith({
      where: {
        id: addressId,
      },
    });

    expect(result).toEqual({
      message: 'Endereço removido com sucesso',
    });
  });

  it('deve impedir remoção de endereço inexistente', async () => {
    prismaMock.address.findFirst.mockResolvedValue(null);

    await expect(
      service.remove(
        addressId,
        userId,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.address.delete).not.toHaveBeenCalled();
  });
});
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAddressDto, userId: string) {
    const address = await this.prisma.address.create({
      data: {
        ...dto,
        userId: userId,
      },
    });
    return address;
  }

  async findAllByUser(userId: string) {
    return this.prisma.address.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string, userId: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id,

        userId,
      },
    });
    if (!address) {
      throw new NotFoundException('Endereço não encontrado');
    }

    return address;
  }

  async update(id: string, userId: string, dto: UpdateAddressDto) {
    await this.findById(id, userId);
    return this.prisma.address.update({
      where: {
        id,
      },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findById(id, userId);
    await this.prisma.address.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Endereço removido com sucesso',
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRestaurantDto, ownerId: string) {
    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId,
      },
    });
    return restaurant;
  }

  async findAllByOwner(ownerId: string) {
    return this.prisma.restaurant.findMany({
      where: {
        ownerId,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string, ownerId: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id,

        ownerId,
      },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurante não encontrado');
    }

    return restaurant;
  }

  async update(id: string, ownerId: string, dto: UpdateRestaurantDto) {
    await this.findById(id, ownerId);
    return this.prisma.restaurant.update({
      where: {
        id,
      },
      data: dto
    });
  }

  async remove(id: string, ownerId: string) {
    await this.findById(id, ownerId);
    await this.prisma.restaurant.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Restaurante removido com sucesso',
    }
  }
}

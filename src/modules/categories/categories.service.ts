import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private restaurantsService: RestaurantsService,
  ) { }

  async create(dto: CreateCategoryDto, restaurantId: string, ownerId: string) {
    await this.restaurantsService.findById(restaurantId, ownerId);

    return this.prisma.category.create({
      data: {
        name: dto.name,
        restaurantId,
      },
    });
  }

  async findAllByRestaurant(restaurantId: string, ownerId: string) {
    await this.restaurantsService.findById(restaurantId, ownerId);

    return this.prisma.category.findMany({
      where: {
        restaurantId,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(categoryId: string, restaurantId: string, ownerId: string) {
    await this.restaurantsService.findById(restaurantId, ownerId);

    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        restaurantId,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  // Retorna as categorias de um restaurante aprovado para a vitrine pública.
  async findPublicAllByRestaurant(restaurantId: string) {
    await this.restaurantsService.findPublicById(restaurantId);

    return this.prisma.category.findMany({
      where: {
        restaurantId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Retorna uma categoria específica de um restaurante aprovado.
  async findPublicById(categoryId: string, restaurantId: string) {
    await this.restaurantsService.findPublicById(restaurantId);

    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        restaurantId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async update(categoryId: string, restaurantId: string, ownerId: string, dto: UpdateCategoryDto) {
    await this.findById(categoryId, restaurantId, ownerId);

    return this.prisma.category.update({
      where: {
        id: categoryId,
      },
      data: dto,
    });
  }

  async remove(
    categoryId: string,
    restaurantId: string,
    ownerId: string,
  ) {
    await this.findById(
      categoryId,
      restaurantId,
      ownerId,
    );

    const productCount = await this.prisma.product.count({
      where: {
        categoryId,
      },
    });

    if (productCount > 0) {
      throw new ConflictException(
        'Não é possível excluir a categoria porque existem produtos associados a ela.',
      );
    }

    await this.prisma.category.delete({
      where: {
        id: categoryId,
      },
    });

    return {
      message: 'Categoria removida com sucesso',
    };
  }
}




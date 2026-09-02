import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
@Injectable()
export class RestaurantsService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService
  ) { }

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

  async update(
    id: string,
    ownerId: string,
    dto: UpdateRestaurantDto,
    logo?: Express.Multer.File,
    banner?: Express.Multer.File,
  ) {
    const restaurant = await this.findById(id, ownerId);

    let logoUrl = restaurant.logo ?? undefined;
    let logoPublicId = restaurant.logoPublicId ?? undefined;

    let bannerUrl = restaurant.banner ?? undefined;
    let bannerPublicId = restaurant.bannerPublicId ?? undefined;

    let oldLogoPublicId: string | undefined;
    let oldBannerPublicId: string | undefined;

    if (logo) {
      const uploadedLogo = await this.cloudinaryService.uploadImage(
        logo,
        `restaurants/${id}/logo`,
      );

      oldLogoPublicId = restaurant.logoPublicId ?? undefined;

      logoUrl = uploadedLogo.url;
      logoPublicId = uploadedLogo.publicId;
    }

    if (banner) {
      const uploadedBanner = await this.cloudinaryService.uploadImage(
        banner,
        `restaurants/${id}/banner`,
      );

      oldBannerPublicId = restaurant.bannerPublicId ?? undefined;

      bannerUrl = uploadedBanner.url;
      bannerPublicId = uploadedBanner.publicId;
    }

    const updatedRestaurant = await this.prisma.restaurant.update({
      where: {
        id,
      },
      data: {
        ...dto,
        logo: logoUrl,
        logoPublicId,
        banner: bannerUrl,
        bannerPublicId,
      },
    });

    if (logo && oldLogoPublicId) {
      await this.cloudinaryService.deleteImage(oldLogoPublicId);
    }

    if (banner && oldBannerPublicId) {
      await this.cloudinaryService.deleteImage(oldBannerPublicId);
    }

    return updatedRestaurant;
  }

  // Retorna apenas restaurantes aprovados para a vitrine pública.
  async findPublicAll() {
    return this.prisma.restaurant.findMany({
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
  }

  // Retorna um restaurante aprovado pelo ID para a vitrine pública.
  async findPublicById(id: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id,
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

    if (!restaurant) {
      throw new NotFoundException('Restaurante não encontrado');
    }

    return restaurant;
  }

  // Retorna os restaurantes que aguardam aprovação administrativa.
  async findPending() {
    return this.prisma.restaurant.findMany({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Aprova um restaurante pendente para disponibilizá-lo na vitrine pública.
  async approve(id: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id,
        status: 'PENDING',
      },
    });

    if (!restaurant) {
      throw new NotFoundException(
        'Restaurante não encontrado ou já processado',
      );
    }

    return this.prisma.restaurant.update({
      where: {
        id,
      },
      data: {
        status: 'APPROVED',
      },
    });
  }

  async remove(id: string, ownerId: string) {
    const restaurant = await this.findById(id, ownerId);

    await this.prisma.restaurant.delete({
      where: {
        id,
      },
    });

    if (restaurant.logoPublicId) {
      await this.cloudinaryService.deleteImage(
        restaurant.logoPublicId,
      );
    }

    if (restaurant.bannerPublicId) {
      await this.cloudinaryService.deleteImage(
        restaurant.bannerPublicId,
      );
    }

    return {
      message: 'Restaurante removido com sucesso',
    };
  }
}

import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
@Injectable()
export class RestaurantsService {
  private readonly logger = new Logger(RestaurantsService.name);
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

    const uploadedPublicIds: string[] = [];

    try {
      // Faz o upload da nova logo e guarda o ID para eventual compensação.
      if (logo) {
        const uploadedLogo = await this.cloudinaryService.uploadImage(
          logo,
          `restaurants/${id}/logo`,
        );

        uploadedPublicIds.push(uploadedLogo.publicId);

        oldLogoPublicId = restaurant.logoPublicId ?? undefined;
        logoUrl = uploadedLogo.url;
        logoPublicId = uploadedLogo.publicId;
      }

      // Faz o upload do novo banner e guarda o ID para eventual compensação.
      if (banner) {
        const uploadedBanner = await this.cloudinaryService.uploadImage(
          banner,
          `restaurants/${id}/banner`,
        );

        uploadedPublicIds.push(uploadedBanner.publicId);

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

      // Remove a logo antiga sem invalidar uma atualização já salva no banco.
      if (logo && oldLogoPublicId) {
        try {
          await this.cloudinaryService.deleteImage(oldLogoPublicId);
        } catch (error) {
          this.logger.error(
            `Falha ao remover logo antiga do restaurante ${id}: ${oldLogoPublicId}`,
            error instanceof Error ? error.stack : error,
          );
        }
      }

      // Remove o banner antigo sem invalidar uma atualização já salva no banco.
      if (banner && oldBannerPublicId) {
        try {
          await this.cloudinaryService.deleteImage(oldBannerPublicId);
        } catch (error) {
          this.logger.error(
            `Falha ao remover banner antigo do restaurante ${id}: ${oldBannerPublicId}`,
            error instanceof Error ? error.stack : error,
          );
        }
      }

      return updatedRestaurant;
    } catch (error) {
      // Compensa uploads que ficaram órfãos porque o banco ou outro upload falhou.
      await Promise.all(
        uploadedPublicIds.map(async (publicId) => {
          try {
            await this.cloudinaryService.deleteImage(publicId);
          } catch (cleanupError) {
            this.logger.error(
              `Falha ao compensar upload da imagem ${publicId} do restaurante ${id}`,
              cleanupError instanceof Error
                ? cleanupError.stack
                : cleanupError,
            );
          }
        }),
      );

      throw error;
    }
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

  // Rejeita um restaurante pendente e impede sua publicação na vitrine.
  async reject(id: string) {
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
        status: 'REJECTED',
      },
    });
  }

  // Suspende um restaurante aprovado e remove sua disponibilidade na vitrine.
  async suspend(id: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id,
        status: 'APPROVED',
      },
    });

    if (!restaurant) {
      throw new NotFoundException(
        'Restaurante não encontrado ou não está aprovado',
      );
    }

    return this.prisma.restaurant.update({
      where: {
        id,
      },
      data: {
        status: 'SUSPENDED',
      },
    });
  }

  // Reativa um restaurante suspenso e o disponibiliza novamente na vitrine.
  async reactivate(id: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id,
        status: 'SUSPENDED',
      },
    });

    if (!restaurant) {
      throw new NotFoundException(
        'Restaurante não encontrado ou não está suspenso',
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

    const [orderCount, cartCount, categoryCount] =
      await Promise.all([
        this.prisma.order.count({
          where: {
            restaurantId: id,
          },
        }),
        this.prisma.cart.count({
          where: {
            restaurantId: id,
          },
        }),
        this.prisma.category.count({
          where: {
            restaurantId: id,
          },
        }),
      ]);

    if (orderCount > 0) {
      throw new ConflictException(
        'Não é possível remover o restaurante porque existem pedidos associados a ele.',
      );
    }

    if (cartCount > 0) {
      throw new ConflictException(
        'Não é possível remover o restaurante porque existem carrinhos associados a ele.',
      );
    }

    if (categoryCount > 0) {
      throw new ConflictException(
        'Não é possível remover o restaurante porque existem categorias associadas a ele.',
      );
    }

    await this.prisma.restaurant.delete({
      where: {
        id,
      },
    });

    // Remove a logo do Cloudinary sem invalidar a remoção já feita no banco.
    if (restaurant.logoPublicId) {
      try {
        await this.cloudinaryService.deleteImage(
          restaurant.logoPublicId,
        );
      } catch (error) {
        this.logger.error(
          `Falha ao remover logo do restaurante ${id}: ${restaurant.logoPublicId}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }

    // Remove o banner do Cloudinary sem invalidar a remoção já feita no banco.
    if (restaurant.bannerPublicId) {
      try {
        await this.cloudinaryService.deleteImage(
          restaurant.bannerPublicId,
        );
      } catch (error) {
        this.logger.error(
          `Falha ao remover banner do restaurante ${id}: ${restaurant.bannerPublicId}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }

    return {
      message: 'Restaurante removido com sucesso',
    };
  }
}

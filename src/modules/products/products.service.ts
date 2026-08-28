import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-prodctdto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private categoriesService: CategoriesService,
    private cloudinaryService: CloudinaryService,
  ) { }

  async create(
    dto: CreateProductDto,
    categoryId: string,
    restaurantId: string,
    ownerId: string,
    file?: Express.Multer.File
  ) {
    await this.categoriesService.findById(categoryId, restaurantId, ownerId);

    let image: string | undefined;
    let imagePublicId: string | undefined;

    if (file) {
      const uploadedImage = await this.cloudinaryService.uploadImage(
        file,
        `restaurants/${restaurantId}/products`,
      );

      image = uploadedImage.url;
      imagePublicId = uploadedImage.publicId;
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        categoryId,
        description: dto.description,
        price: dto.price,
        image,
        imagePublicId,
      },
    });
  }

  async findAll(
    categoryId: string,
    restaurantId: string,
    ownerId: string,
  ) {
    await this.categoriesService.findById(categoryId, restaurantId, ownerId);

    return this.prisma.product.findMany({
      where: {
        categoryId,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(productId: string, categoryId: string, restaurantId: string, ownerId: string) {
    await this.categoriesService.findById(categoryId, restaurantId, ownerId);

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        categoryId,
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product;
  }

  async update(productId: string, categoryId: string, restaurantId: string, ownerId: string, dto: UpdateProductDto) {
    await this.findById(productId, categoryId, restaurantId, ownerId);

    return this.prisma.product.update({
      where: {
        id: productId,
      },
      data: dto,
    });
  }

  async remove(productId: string, categoryId: string, restaurantId: string, ownerId: string) {
    await this.findById(productId, categoryId, restaurantId, ownerId);

    await this.prisma.product.delete({
      where: {
        id: productId,
      },
    });

    return {
      message: 'Produto removido com sucesso',
    };
  }


  async findAvailableById(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
      },
      include: {
        category: {
          include: {
            restaurant: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produto nao encontrado');
    }

    if (!product.isAvailable) {
      throw new BadRequestException('Produto nao disponivel');
    }

    return product;
  }
}




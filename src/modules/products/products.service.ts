import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  // Retorna apenas os produtos disponíveis de um restaurante aprovado.
  async findPublicAll(
    restaurantId: string,
    categoryId: string,
  ) {
    await this.categoriesService.findPublicById(
      categoryId,
      restaurantId,
    );

    return this.prisma.product.findMany({
      where: {
        categoryId,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        isAvailable: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Retorna um produto disponível de uma categoria e restaurante aprovados.
  async findPublicById(
    productId: string,
    restaurantId: string,
    categoryId: string,
  ) {
    await this.categoriesService.findPublicById(
      categoryId,
      restaurantId,
    );

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        categoryId,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        isAvailable: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product;
  }

  async update(productId: string, categoryId: string, restaurantId: string, ownerId: string, dto: UpdateProductDto, file?: Express.Multer.File,) {
    const product = await this.findById(
      productId,
      categoryId,
      restaurantId,
      ownerId,
    );

    let image: string | undefined = product.image ?? undefined;
    let imagePublicId: string | undefined =
      product.imagePublicId ?? undefined;

    let oldImagePublicId: string | undefined;

    if (file) {
      const uploadedImage = await this.cloudinaryService.uploadImage(
        file,
        `restaurants/${restaurantId}/products`,
      );

      oldImagePublicId = product.imagePublicId ?? undefined;

      image = uploadedImage.url;
      imagePublicId = uploadedImage.publicId;
    }

    const updatedProduct = await this.prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        ...dto,
        image,
        imagePublicId,
      },
    });

    if (file && oldImagePublicId) {
      await this.cloudinaryService.deleteImage(oldImagePublicId);
    }

    return updatedProduct;
  }

  async remove(
    productId: string,
    categoryId: string,
    restaurantId: string,
    ownerId: string,
  ) {
    const product = await this.findById(
      productId,
      categoryId,
      restaurantId,
      ownerId,
    );

    const [orderItemCount, cartItemCount] =
      await Promise.all([
        this.prisma.orderItem.count({
          where: {
            productId,
          },
        }),
        this.prisma.cartItem.count({
          where: {
            productId,
          },
        }),
      ]);

    if (orderItemCount > 0) {
      throw new ConflictException(
        'Não é possível excluir o produto porque ele possui itens em pedidos.',
      );
    }

    if (cartItemCount > 0) {
      throw new ConflictException(
        'Não é possível excluir o produto porque ele está presente em carrinhos.',
      );
    }

    await this.prisma.product.delete({
      where: {
        id: productId,
      },
    });

    if (product.imagePublicId) {
      await this.cloudinaryService.deleteImage(
        product.imagePublicId,
      );
    }

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




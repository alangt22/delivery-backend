import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  // Retorna todos os usuários para a administração sem expor o passwordHash.
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        googleId: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  // Busca um usuário pelo ID sem expor o passwordHash.
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        googleId: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  // Bloqueia um usuário e impede que ele se autentique ou use a API.
  async block(id: string, adminId: string) {
    if (id === adminId) {
      throw new ForbiddenException(
        'Você não pode bloquear seu próprio usuário',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        isBlocked: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        googleId: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Desbloqueia um usuário e permite que ele volte a acessar a API.
  async unblock(id: string, adminId: string) {
    if (id === adminId) {
      throw new ForbiddenException(
        'Você não pode desbloquear seu próprio usuário',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        isBlocked: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        googleId: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
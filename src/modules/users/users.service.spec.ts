import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
    let service: UsersService;
    let prismaMock: any;

    beforeEach(async () => {
        prismaMock = {
            user: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    it('deve listar os usuários sem retornar passwordHash', async () => {
        const users = [
            {
                id: 'user-1',
                name: 'Alan',
                email: 'alan@example.com',
                googleId: null,
                role: 'CUSTOMER',
                isBlocked: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];

        prismaMock.user.findMany.mockResolvedValue(users);

        const result = await service.findAll();

        expect(prismaMock.user.findMany).toHaveBeenCalledWith({
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

        expect(result).toEqual(users);
        expect(result[0]).not.toHaveProperty('passwordHash');
    });

    it('deve buscar um usuário pelo ID sem retornar passwordHash', async () => {
        const user = {
            id: 'user-1',
            name: 'Alan',
            email: 'alan@example.com',
            googleId: null,
            role: 'CUSTOMER',
            isBlocked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        prismaMock.user.findUnique.mockResolvedValue(user);

        const result = await service.findById('user-1');

        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
            where: {
                id: 'user-1',
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

        expect(result).toEqual(user);
        expect(result).not.toHaveProperty('passwordHash');
    });

    it('deve lançar NotFoundException quando o usuário não existe', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        await expect(
            service.findById('user-inexistente'),
        ).rejects.toThrow(NotFoundException);
    });

    it('deve retornar uma lista vazia quando não existem usuários', async () => {
        prismaMock.user.findMany.mockResolvedValue([]);

        const result = await service.findAll();

        expect(result).toEqual([]);
    });

    it('deve bloquear um usuário existente', async () => {
        const user = {
            id: 'user-1',
            name: 'Alan',
            email: 'alan@example.com',
            googleId: null,
            role: 'CUSTOMER',
            isBlocked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const blockedUser = {
            ...user,
            isBlocked: true,
        };

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.user.update.mockResolvedValue(blockedUser);

        const result = await service.block('user-1', 'admin-1');

        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
            where: {
                id: 'user-1',
            },
        });

        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: {
                id: 'user-1',
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

        expect(result).toEqual(blockedUser);
    });

    it('deve lançar NotFoundException ao tentar bloquear usuário inexistente', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        await expect(
            service.block('user-inexistente', 'admin-1'),
        ).rejects.toThrow(NotFoundException);

        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('deve impedir o administrador de bloquear a si mesmo', async () => {
        await expect(
            service.block('admin-1', 'admin-1'),
        ).rejects.toThrow(ForbiddenException);

        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('deve desbloquear um usuário existente', async () => {
        const user = {
            id: 'user-1',
            name: 'Alan',
            email: 'alan@example.com',
            googleId: null,
            role: 'CUSTOMER',
            isBlocked: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const unblockedUser = {
            ...user,
            isBlocked: false,
        };

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.user.update.mockResolvedValue(unblockedUser);

        const result = await service.unblock('user-1', 'admin-1');

        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
            where: {
                id: 'user-1',
            },
        });

        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: {
                id: 'user-1',
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

        expect(result).toEqual(unblockedUser);
    });

    it('deve lançar NotFoundException ao tentar desbloquear usuário inexistente', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        await expect(
            service.unblock('user-inexistente', 'admin-1'),
        ).rejects.toThrow(NotFoundException);

        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('deve impedir o administrador de desbloquear a si mesmo', async () => {
        await expect(
            service.unblock('admin-1', 'admin-1'),
        ).rejects.toThrow(ForbiddenException);

        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
});
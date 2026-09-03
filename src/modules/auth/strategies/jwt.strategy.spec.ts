import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
      },
    };

    strategy = new JwtStrategy(prismaMock as PrismaService);
  });

  it('deve retornar o usuário quando ele existe e está ativo', async () => {
    const user = {
      id: 'user-1',
      name: 'Alan',
      email: 'alan@example.com',
      role: 'CUSTOMER',
      isBlocked: false,
    };

    prismaMock.user.findUnique.mockResolvedValue(user);

    const result = await strategy.validate({
      sub: 'user-1',
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
      },
    });

    expect(result).toEqual(user);
  });

  it('deve rejeitar o JWT quando o usuário não existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'user-1',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve rejeitar o JWT quando o usuário está bloqueado', async () => {
    const blockedUser = {
      id: 'user-1',
      name: 'Alan',
      email: 'alan@example.com',
      role: 'CUSTOMER',
      isBlocked: true,
    };

    prismaMock.user.findUnique.mockResolvedValue(blockedUser);

    await expect(
      strategy.validate({
        sub: 'user-1',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
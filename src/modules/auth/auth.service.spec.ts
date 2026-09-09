import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from './auth.service';
import { Profile } from 'passport-google-oauth20';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: any;
  let jwtServiceMock: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtServiceMock = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('deve cadastrar usuário, criar hash da senha e não retornar passwordHash', async () => {
    const dto = {
      name: 'Alan',
      email: 'alan@example.com',
      password: 'password123',
    };
    const createdUser = {
      id: 'user-1',
      name: dto.name,
      email: dto.email,
      passwordHash: 'hashed-password',
      role: 'CUSTOMER',
    };

    prismaMock.user.findUnique.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    prismaMock.user.create.mockResolvedValue(createdUser);

    const result = await service.register(dto);

    expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: 'hashed-password',
      },
    });
    expect(result).toEqual({
      id: 'user-1',
      name: dto.name,
      email: dto.email,
      role: 'CUSTOMER',
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('deve impedir cadastro com e-mail já existente sem gerar hash', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.register({
        name: 'Alan',
        email: 'alan@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(ConflictException);

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('deve lançar UnauthorizedException quando o usuário não existe no login', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'alan@example.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      service.login({
        email: 'alan@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow('Email ou senha inválidos');

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('deve impedir login por senha de usuário bloqueado', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'alan@example.com',
      passwordHash: 'hashed-password',
      role: 'CUSTOMER',
      isBlocked: true,
    });

    await expect(
      service.login({
        email: 'alan@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('deve bloquear login por senha para conta Google sem passwordHash', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'alan@example.com',
      passwordHash: null,
    });

    await expect(
      service.login({
        email: 'alan@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('deve bloquear login quando a senha está incorreta', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'alan@example.com',
      passwordHash: 'hashed-password',
      role: 'CUSTOMER',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({
        email: 'alan@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'wrong-password',
      'hashed-password',
    );

    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('deve retornar access_token para login válido', async () => {
    const user = {
      id: 'user-1',
      email: 'alan@example.com',
      passwordHash: 'hashed-password',
      role: 'CUSTOMER',
    };

    prismaMock.user.findUnique.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue('jwt-token');

    const result = await service.login({
      email: user.email,
      password: 'password123',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'password123',
      'hashed-password',
    );
    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    expect(result).toEqual({ access_token: 'jwt-token' });
  });

  it('deve criar usuário novo ao validar login com Google', async () => {
    const profile = {
      id: 'google-id-1',
      displayName: 'Alan',
      emails: [{ value: 'alan@example.com' }],
    } as Profile;

    const createdUser = {
      id: 'user-1',
      name: 'Alan',
      email: 'alan@example.com',
      googleId: 'google-id-1',
      role: 'CUSTOMER',
      passwordHash: null,
    };

    prismaMock.user.findUnique.mockResolvedValue(null);

    prismaMock.user.create.mockResolvedValue(createdUser);

    jwtServiceMock.signAsync.mockResolvedValue('jwt-token');

    await service.validateGoogleUser(profile);

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        name: profile.displayName,
        email: profile.emails?.[0]?.value,
        googleId: profile.id,
      },
    });
  });

  it('deve vincular googleId quando o usuário existente ainda não possui googleId', async () => {
    const profile = {
      id: 'google-id-1',
      displayName: 'Alan',
      emails: [{ value: 'alan@example.com' }],
    } as Profile;

    const createdUser = {
      id: 'user-1',
      name: 'Alan',
      email: 'alan@example.com',
      googleId: null,
      role: 'CUSTOMER',
      passwordHash: null,
    };

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'alan@example.com',
      googleId: null,
    });

    prismaMock.user.update.mockResolvedValue(createdUser);

    jwtServiceMock.signAsync.mockResolvedValue('jwt-token');

    await service.validateGoogleUser(profile);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
      },
      data: {
        googleId: profile.id,
      },
    });
  });

  it('deve reutilizar usuário existente que já possui googleId sem atualizá-lo', async () => {
    const profile = {
      id: 'google-id-1',
      displayName: 'Alan',
      emails: [{ value: 'alan@example.com' }],
    } as Profile;

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'alan@example.com',
      googleId: 'google-id-1',
      role: 'CUSTOMER',
    });

    jwtServiceMock.signAsync.mockResolvedValue('jwt-token');

    await service.validateGoogleUser(profile);

    expect(prismaMock.user.update).not.toHaveBeenCalled();

  });

  it('deve gerar access_token e não retornar passwordHash ao validar usuário do Google', async () => {
    const profile = {
      id: 'google-id-1',
      displayName: 'Alan',
      emails: [{ value: 'alan@example.com' }],
    } as Profile;

    const createdUser = {
      id: 'user-1',
      name: 'Alan',
      email: 'alan@example.com',
      googleId: 'google-id-1',
      role: 'CUSTOMER',
      passwordHash: 'hashed-password',
    };

    prismaMock.user.findUnique.mockResolvedValue(createdUser);

    jwtServiceMock.signAsync.mockResolvedValue('jwt-token');

    const result = await service.validateGoogleUser(profile);

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'alan@example.com',
      role: 'CUSTOMER',
    });
    expect(result).toEqual({
      access_token: 'jwt-token',
      user: {
        id: 'user-1',
        name: 'Alan',
        email: 'alan@example.com',
        googleId: 'google-id-1',
        role: 'CUSTOMER',
      }
    });

    expect(result.user).not.toHaveProperty('passwordHash');
  })

  it('deve impedir login com Google para usuário bloqueado', async () => {
    const profile = {
      id: 'google-id-1',
      displayName: 'Alan',
      emails: [{ value: 'alan@example.com' }],
    } as Profile;

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Alan',
      email: 'alan@example.com',
      googleId: 'google-id-1',
      role: 'CUSTOMER',
      isBlocked: true,
    });

    await expect(
      service.validateGoogleUser(profile),
    ).rejects.toThrow(UnauthorizedException);

    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });
});

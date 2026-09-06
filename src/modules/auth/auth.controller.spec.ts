import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceMock: any;

  const userId = 'user-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    authServiceMock = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deve registrar um usuário', async () => {
    const dto = {
      name: 'Alan',
      email: 'alan@example.com',
      password: '123456',
    };

    const response = {
      id: userId,
      name: 'Alan',
      email: 'alan@example.com',
      role: 'CUSTOMER',
    };

    authServiceMock.register.mockResolvedValue(response);

    const result = await controller.register(dto);

    expect(authServiceMock.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual(response);
  });

  it('deve realizar login do usuário', async () => {
    const dto = {
      email: 'alan@example.com',
      password: '123456',
    };

    const response = {
      access_token: 'jwt-token',
      user: {
        id: userId,
        email: 'alan@example.com',
        role: 'CUSTOMER',
      },
    };

    authServiceMock.login.mockResolvedValue(response);

    const res = {
      cookie: jest.fn(),
    } as any;

    const result = await controller.login(dto, res);

    expect(authServiceMock.login).toHaveBeenCalledWith(dto);

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'jwt-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
      }),
    );

    expect(result).toEqual({
      message: 'Login realizado com sucesso.',
    });
  });

  it('deve retornar o usuário autenticado sem passwordHash', () => {
    const req = {
      user: {
        id: userId,
        name: 'Alan',
        email: 'alan@example.com',
        role: 'CUSTOMER',
        passwordHash: 'hashed-password',
      },
    };

    const result = controller.me(req);

    expect(result).toEqual({
      id: userId,
      name: 'Alan',
      email: 'alan@example.com',
      role: 'CUSTOMER',
    });

    expect(result).not.toHaveProperty('passwordHash');
  });

  it('deve retornar os dados do usuário autenticado', () => {
    const req = {
      user: {
        id: userId,
        name: 'Alan',
        email: 'alan@example.com',
        role: 'CUSTOMER',
        passwordHash: null,
      },
    };

    const result = controller.me(req);

    expect(result).toEqual({
      id: userId,
      name: 'Alan',
      email: 'alan@example.com',
      role: 'CUSTOMER',
    });
  });

  it('deve executar o fluxo de autenticação do Google', () => {
    const result = controller.googleAuth();

    expect(result).toBeUndefined();
  });

  it('deve redirecionar após o callback do Google com o access_token', () => {
    const req = {
      user: {
        access_token: 'jwt-token',
      },
    };

    const res = {
      cookie: jest.fn(),
      redirect: jest.fn(),
    };

    controller.googleCallback(req, res as any);

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'jwt-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
      }),
    );

    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:3001',
    );
  });
});
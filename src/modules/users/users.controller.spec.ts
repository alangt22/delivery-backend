import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersServiceMock: any;

  beforeEach(async () => {
    usersServiceMock = {
      findAll: jest.fn(),
      findById: jest.fn(),
      block: jest.fn(),
      unblock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: RolesGuard,
          useValue: {
            canActivate: jest.fn(),
          },
        },
        {
          provide: JwtAuthGuard,
          useValue: {
            canActivate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('deve listar todos os usuários', async () => {
    const users = [
      {
        id: 'user-1',
        name: 'Alan',
        email: 'alan@example.com',
        role: 'CUSTOMER',
        isBlocked: false,
      },
    ];

    usersServiceMock.findAll.mockResolvedValue(users);

    const result = await controller.findAll();

    expect(usersServiceMock.findAll).toHaveBeenCalled();
    expect(result).toEqual(users);
  });

  it('deve buscar um usuário pelo ID', async () => {
    const user = {
      id: 'user-1',
      name: 'Alan',
      email: 'alan@example.com',
      role: 'CUSTOMER',
      isBlocked: false,
    };

    usersServiceMock.findById.mockResolvedValue(user);

    const result = await controller.findById('user-1');

    expect(usersServiceMock.findById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(user);
  });

  it('deve bloquear um usuário usando o ID do administrador autenticado', async () => {
    const blockedUser = {
      id: 'user-1',
      name: 'Alan',
      email: 'alan@example.com',
      role: 'CUSTOMER',
      isBlocked: true,
    };

    usersServiceMock.block.mockResolvedValue(blockedUser);

    const req = {
      user: {
        id: 'admin-1',
      },
    };

    const result = await controller.block('user-1', req);

    expect(usersServiceMock.block).toHaveBeenCalledWith(
      'user-1',
      'admin-1',
    );
    expect(result).toEqual(blockedUser);
  });

  it('deve desbloquear um usuário usando o ID do administrador autenticado', async () => {
    const unblockedUser = {
      id: 'user-1',
      name: 'Alan',
      email: 'alan@example.com',
      role: 'CUSTOMER',
      isBlocked: false,
    };

    usersServiceMock.unblock.mockResolvedValue(unblockedUser);

    const req = {
      user: {
        id: 'admin-1',
      },
    };

    const result = await controller.unblock('user-1', req);

    expect(usersServiceMock.unblock).toHaveBeenCalledWith(
      'user-1',
      'admin-1',
    );
    expect(result).toEqual(unblockedUser);
  });
});
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  // Cria um contexto HTTP simulado com o usuário informado.
  const createContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user,
        }),
      }),
    } as any;
  };

  it('deve permitir acesso para um ADMIN', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN]);

    const context = createContext({
      id: 'admin-1',
      role: Role.ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve bloquear acesso para um CUSTOMER', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN]);

    const context = createContext({
      id: 'customer-1',
      role: Role.CUSTOMER,
    });

    expect(() => guard.canActivate(context)).toThrow(
      'Você não tem permissão para acessar este recurso',
    );
  });

  it('deve permitir acesso quando a rota não exige uma role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined);

    const context = createContext({
      id: 'customer-1',
      role: Role.CUSTOMER,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve bloquear acesso quando não houver usuário autenticado', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN]);

    const context = createContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(
      'Você não tem permissão para acessar este recurso',
    );
  });
});
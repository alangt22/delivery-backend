import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // Verifica se o usuário autenticado possui uma das roles exigidas pela rota.
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Permite acesso quando a rota não exige uma role específica.
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Bloqueia o acesso quando o usuário não possui uma role permitida.
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este recurso',
      );
    }

    return true;
  }
}
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Define quais roles podem acessar uma rota.
export const Roles = (...roles: Role[]) =>
  SetMetadata(ROLES_KEY, roles);
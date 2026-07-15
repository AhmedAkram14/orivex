import { SetMetadata } from '@nestjs/common';

import type { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';

export const ROLES_KEY = 'roles';

// Reuses Identity's existing AccountRole enum -- no duplicate role set
// introduced. Consumed by RolesGuard, exported alongside JwtAuthGuard so any
// module can protect a route without depending on AuthenticationModule's
// internals.
export const Roles = (...roles: AccountRole[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);

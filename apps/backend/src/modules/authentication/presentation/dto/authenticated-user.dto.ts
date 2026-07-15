import type { Account } from '../../../identity/domain/entities/account.entity.js';

// Matches apps/frontend/src/shared/auth/types.ts's AuthenticatedUser shape
// exactly (id, email, fullName, roles: Role[]) -- the frontend models roles
// as a plural claim (originally speculating a future multi-role Keycloak
// token); the real backend has exactly one role per Account, so this wraps
// it in a single-element array rather than fabricating additional roles.
export class AuthenticatedUserDto {
  id!: string;
  email!: string;
  fullName!: string;
  roles!: string[];

  static fromAccount(account: Account): AuthenticatedUserDto {
    const dto = new AuthenticatedUserDto();
    dto.id = account.getId().toString();
    dto.email = account.getEmail().toString();
    dto.fullName = account.getUserProfile().getDisplayName().toString();
    dto.roles = [account.getRole()];
    return dto;
  }
}

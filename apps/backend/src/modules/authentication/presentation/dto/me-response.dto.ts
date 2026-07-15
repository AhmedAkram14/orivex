import type { AuthenticatedUserDto } from './authenticated-user.dto.js';

export class MeResponseDto {
  user!: AuthenticatedUserDto;
}

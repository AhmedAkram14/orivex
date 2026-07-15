import type { AuthenticatedUserDto } from './authenticated-user.dto.js';

export class LoginResponseDto {
  user!: AuthenticatedUserDto;
  accessToken!: string;
  accessTokenExpiresAt!: string;
  // MFA is not implemented -- always false, per the frontend's own comment
  // that no flow branches on this yet (types.ts: "prepares the type, not
  // the flow").
  mfaRequired = false;
}

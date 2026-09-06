import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

// Matches docs/12-openapi.md's GrantOrRevokeConsent request body exactly.
// doctorId is documented as nullable (platform-wide scope), but this pass
// only implements the doctor-scoped case (see ConsentRecord's own schema
// comment for why) -- the controller rejects a null/absent doctorId with a
// clear validation error rather than silently accepting a request it can't
// actually act on.
export class GrantOrRevokeConsentRequestDto {
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsString()
  @IsNotEmpty()
  scopeCategory!: string;

  @IsIn(['grant', 'revoke'])
  action!: 'grant' | 'revoke';

  @IsString()
  @IsNotEmpty()
  legalBasisVersion!: string;
}

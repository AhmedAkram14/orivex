import { parseUserAgent } from '../../../../platform/http/parse-user-agent.js';
import { resolveIpLocation } from '../../../../platform/http/resolve-ip-location.js';
import type { GetSecuritySummaryResult } from '../../application/use-cases/get-security-summary/get-security-summary.use-case.js';

export class LastSignInSummaryDto {
  at!: string;
  displayName!: string;
  city?: string;
  country?: string;
}

export class SecuritySummaryResponseDto {
  activeSessionCount!: number;
  lastSignIn?: LastSignInSummaryDto;
  passwordChangedAt?: string;
  twoFactorEnabled!: boolean;

  static fromResult(result: GetSecuritySummaryResult): SecuritySummaryResponseDto {
    const dto = new SecuritySummaryResponseDto();
    dto.activeSessionCount = result.activeSessionCount;
    dto.twoFactorEnabled = result.twoFactorEnabled;
    dto.passwordChangedAt = result.passwordChangedAt?.toISOString();

    if (result.lastSuccessfulLogin) {
      const ua = parseUserAgent(result.lastSuccessfulLogin.getUserAgent());
      const ip = result.lastSuccessfulLogin.getIpAddress();
      const location = ip ? resolveIpLocation(ip) : null;
      const lastSignIn = new LastSignInSummaryDto();
      lastSignIn.at = result.lastSuccessfulLogin.getDetectedAt().toISOString();
      lastSignIn.displayName = ua.displayName;
      lastSignIn.city = location?.city;
      lastSignIn.country = location?.country;
      dto.lastSignIn = lastSignIn;
    }

    return dto;
  }
}

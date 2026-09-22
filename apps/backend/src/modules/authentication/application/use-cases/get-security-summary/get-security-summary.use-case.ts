import type { SecurityEvent } from '../../../../trust/domain/entities/security-event.entity.js';
import { SecurityEventType } from '../../../../trust/domain/enums/security-event-type.enum.js';
import type { ListSecurityEventsForAccountUseCase } from '../../../../trust/application/use-cases/list-security-events-for-account/list-security-events-for-account.use-case.js';
import type { CredentialRepository } from '../../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../../domain/repositories/session.repository.js';

import type { GetSecuritySummaryQuery } from './get-security-summary.query.js';

export interface GetSecuritySummaryResult {
  activeSessionCount: number;
  lastSuccessfulLogin: SecurityEvent | null;
  // Most recent PasswordChanged SecurityEvent's detectedAt -- derived, not a
  // stored column (see login-history-page-response.dto.ts's sibling DTOs
  // for the same "compute on read" reasoning). null means "no record of a
  // change" (never changed, or predates this tracking).
  passwordChangedAt: Date | null;
  // Hardcoded false -- no 2FA/MFA implementation exists anywhere in this
  // codebase yet (only an unused `mfaRequired` placeholder on the frontend's
  // login response type). Never branch UI on this expecting it to someday
  // flip true on its own; it will only do so once real 2FA ships here.
  twoFactorEnabled: boolean;
}

export class GetSecuritySummaryUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly listSecurityEventsForAccountUseCase: ListSecurityEventsForAccountUseCase,
  ) {}

  async execute(query: GetSecuritySummaryQuery): Promise<GetSecuritySummaryResult | null> {
    const credential = await this.credentialRepository.findByAccountId(query.accountId);
    if (!credential) {
      return null;
    }

    const activeSessions = await this.sessionRepository.findAllActiveForCredential(credential.getId());
    const events = await this.listSecurityEventsForAccountUseCase.execute({ accountId: query.accountId });

    const lastSuccessfulLogin = mostRecentOfType(events, SecurityEventType.LoginSucceeded);
    const lastPasswordChange = mostRecentOfType(events, SecurityEventType.PasswordChanged);

    return {
      activeSessionCount: activeSessions.length,
      lastSuccessfulLogin,
      passwordChangedAt: lastPasswordChange?.getDetectedAt() ?? null,
      twoFactorEnabled: false,
    };
  }
}

function mostRecentOfType(events: SecurityEvent[], type: SecurityEventType): SecurityEvent | null {
  const matches = events.filter((event) => event.getEventType() === type);
  if (matches.length === 0) {
    return null;
  }
  return matches.reduce((latest, event) => (event.getDetectedAt() > latest.getDetectedAt() ? event : latest));
}

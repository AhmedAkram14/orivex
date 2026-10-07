import type { DomainEventDispatcher } from '../../../../shared/domain/domain-event-dispatcher.js';
import { parseUserAgent } from '../../../../platform/http/parse-user-agent.js';
import { resolveIpLocation } from '../../../../platform/http/resolve-ip-location.js';
import type { Account } from '../../../identity/domain/entities/account.entity.js';
import { RecordSecurityEventCommand } from '../../../trust/application/use-cases/record-security-event/record-security-event.command.js';
import type { RecordSecurityEventUseCase } from '../../../trust/application/use-cases/record-security-event/record-security-event.use-case.js';
import { SecurityEventType } from '../../../trust/domain/enums/security-event-type.enum.js';
import { REFRESH_TOKEN_TTL_DAYS } from '../../domain/constants/authentication.constants.js';
import type { Credential } from '../../domain/entities/credential.entity.js';
import { Session } from '../../domain/entities/session.entity.js';
import { NewDeviceLoginDetectedEvent } from '../../domain/events/new-device-login-detected.event.js';
import type { CredentialRepository } from '../../domain/repositories/credential.repository.js';
import type { SessionRepository } from '../../domain/repositories/session.repository.js';
import { PlainToken } from '../../domain/value-objects/plain-token.value-object.js';
import { TokenHash } from '../../domain/value-objects/token-hash.value-object.js';
import type { JwtSignerPort } from '../ports/jwt-signer.port.js';
import type { TokenGeneratorPort } from '../ports/token-generator.port.js';

export interface IssueSessionDeps {
  credentialRepository: CredentialRepository;
  sessionRepository: SessionRepository;
  tokenGenerator: TokenGeneratorPort;
  jwtSigner: JwtSignerPort;
  recordSecurityEventUseCase: RecordSecurityEventUseCase;
  eventDispatcher: DomainEventDispatcher;
}

export interface IssueSessionInput {
  account: Account;
  credential: Credential;
  ipAddress?: string;
  userAgent?: string;
  // Extra context stored on the LoginSucceeded SecurityEvent -- e.g.
  // `{ method: 'google' }` for Social Sign-In, so login history can tell
  // the sign-in methods apart without a new SecurityEventType.
  securityEventMetadata?: Record<string, unknown>;
}

export interface IssuedSession {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

// Everything that happens once a person has proven who they are, whatever
// the proof was (password -- LoginUseCase; Google/Facebook --
// CompleteOAuthSignInUseCase, docs/14-adrs.md ADR-008): reset the lockout
// counter, audit the success, mint the access token, open a refresh-token
// Session, and raise the new-device notice. One copy, so the two sign-in
// paths can never drift apart on what a "successful login" means.
export async function issueSessionAfterSuccessfulLogin(
  deps: IssueSessionDeps,
  input: IssueSessionInput,
): Promise<IssuedSession> {
  const { account, credential } = input;

  credential.recordSuccessfulLogin();
  await deps.credentialRepository.save(credential);
  await deps.eventDispatcher.dispatch(credential.releaseDomainEvents());
  await deps.recordSecurityEventUseCase.execute(
    new RecordSecurityEventCommand({
      accountId: account.getId().toString(),
      eventType: SecurityEventType.LoginSucceeded,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: input.securityEventMetadata,
    }),
  );

  // Best-effort "is this a new device" heuristic -- compares the parsed
  // UA displayName + exact IP against the account's other still-active
  // sessions (created BEFORE this one). Not a cryptographic device
  // fingerprint: a browser update or a new IP on a familiar laptop both
  // read as "new". Skipped entirely on an account's very first-ever
  // session (nothing to compare against, and a first login isn't
  // suspicious) to avoid emailing every brand-new signup.
  const priorActiveSessions = await deps.sessionRepository.findAllActiveForCredential(credential.getId());
  const currentUa = parseUserAgent(input.userAgent);
  const isNewDevice =
    priorActiveSessions.length > 0 &&
    !priorActiveSessions.some((existing) => {
      const existingUa = parseUserAgent(existing.getUserAgent());
      return existingUa.displayName === currentUa.displayName && existing.getIpAddress() === input.ipAddress;
    });

  const accessToken = await deps.jwtSigner.sign({
    accountId: account.getId().toString(),
    role: account.getRole(),
  });

  const plainRefreshToken = PlainToken.create(deps.tokenGenerator.generate());
  const refreshTokenHash = TokenHash.create(deps.tokenGenerator.hash(plainRefreshToken.toString()));
  const session = Session.create({
    credentialId: credential.getId(),
    refreshTokenHash,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86_400_000),
  });
  await deps.sessionRepository.save(session);
  await deps.eventDispatcher.dispatch(session.releaseDomainEvents());

  if (isNewDevice) {
    const location = input.ipAddress ? resolveIpLocation(input.ipAddress) : null;
    await deps.eventDispatcher.dispatch([
      new NewDeviceLoginDetectedEvent(account.getId().toString(), currentUa.displayName, location?.city, location?.country),
    ]);
  }

  return {
    accessToken: accessToken.token,
    accessTokenExpiresAt: accessToken.expiresAt,
    refreshToken: plainRefreshToken.toString(),
    refreshTokenExpiresAt: session.getExpiresAt(),
  };
}

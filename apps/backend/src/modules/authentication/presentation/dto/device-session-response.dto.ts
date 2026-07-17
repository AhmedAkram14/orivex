import type { Session } from '../../domain/entities/session.entity.js';

// Matches the frontend's honest DeviceSession contract exactly
// (features/auth/api/types.ts): { id, userAgent?, ipAddress?, lastActiveAt,
// isCurrent }. Deliberately no deviceName/browser/os/location split -- the
// Session aggregate only ever stores a raw userAgent string and an
// ipAddress, and there is no geo-IP/user-agent-parsing service in this
// codebase to honestly fabricate those fields from.
export class DeviceSessionResponseDto {
  id!: string;
  userAgent?: string;
  ipAddress?: string;
  lastActiveAt!: string;
  isCurrent!: boolean;

  static fromDomain(session: Session, isCurrent: boolean): DeviceSessionResponseDto {
    const dto = new DeviceSessionResponseDto();
    dto.id = session.getId();
    dto.userAgent = session.getUserAgent();
    dto.ipAddress = session.getIpAddress();
    dto.lastActiveAt = session.getLastUsedAt().toISOString();
    dto.isCurrent = isCurrent;
    return dto;
  }
}

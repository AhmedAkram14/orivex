import { parseUserAgent } from '../../../../platform/http/parse-user-agent.js';
import { resolveIpLocation } from '../../../../platform/http/resolve-ip-location.js';
import type { Session } from '../../domain/entities/session.entity.js';

// Matches the frontend's DeviceSession contract (features/auth/api/types.ts).
// The Session aggregate only ever stores a raw userAgent string and an
// ipAddress -- browser/os/deviceType/city/country are enriched here, on
// read, via parseUserAgent()/resolveIpLocation() rather than stored, so a
// parser/geo-DB upgrade improves every past session's display for free.
export class DeviceSessionResponseDto {
  id!: string;
  userAgent?: string;
  ipAddress?: string;
  lastActiveAt!: string;
  isCurrent!: boolean;
  browser?: string;
  browserVersion?: string;
  os?: string;
  deviceType?: string;
  displayName!: string;
  isUnrecognizedClient!: boolean;
  city?: string;
  country?: string;

  static fromDomain(session: Session, isCurrent: boolean): DeviceSessionResponseDto {
    const dto = new DeviceSessionResponseDto();
    const ua = parseUserAgent(session.getUserAgent());
    const ip = session.getIpAddress();
    const location = ip ? resolveIpLocation(ip) : null;

    dto.id = session.getId();
    dto.userAgent = session.getUserAgent();
    dto.ipAddress = ip;
    dto.lastActiveAt = session.getLastUsedAt().toISOString();
    dto.isCurrent = isCurrent;
    dto.browser = ua.browser;
    dto.browserVersion = ua.browserVersion;
    dto.os = ua.os;
    dto.deviceType = ua.deviceType;
    dto.displayName = ua.displayName;
    dto.isUnrecognizedClient = ua.isUnrecognizedClient;
    dto.city = location?.city;
    dto.country = location?.country;
    return dto;
  }
}

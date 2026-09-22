interface ClientIpSource {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

const IPV4_MAPPED_PREFIX = '::ffff:';

function firstForwardedValue(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  const first = raw?.split(',')[0]?.trim();
  return first ? first : undefined;
}

function stripIpv6Mapping(ip: string): string {
  return ip.startsWith(IPV4_MAPPED_PREFIX) ? ip.slice(IPV4_MAPPED_PREFIX.length) : ip;
}

// Render terminates TLS at its own reverse proxy, so the connection's own
// remote address (req.ip) is always that proxy's internal hop, never the
// real client. X-Forwarded-For (set by Render) carries the real chain;
// X-Real-IP/X-Vercel-Forwarded-For are fallbacks for other front doors this
// backend might sit behind in the future.
export function getClientIp(req: ClientIpSource): string {
  const candidate =
    firstForwardedValue(req.headers['x-forwarded-for']) ??
    firstForwardedValue(req.headers['x-real-ip']) ??
    firstForwardedValue(req.headers['x-vercel-forwarded-for']) ??
    req.ip ??
    '';
  return stripIpv6Mapping(candidate);
}

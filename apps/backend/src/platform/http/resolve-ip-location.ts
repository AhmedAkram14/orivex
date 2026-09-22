import geoip from 'geoip-lite';

export interface IpLocation {
  city: string;
  country: string;
}

// Offline MaxMind-derived lookup -- no external API call, no per-request
// latency or third-party dependency at request time. Chosen over Vercel's
// x-vercel-ip-* headers because this backend runs on Render: those headers
// only exist on requests that terminate at Vercel's own edge, never on
// requests forwarded on to a Render-hosted API.
export function resolveIpLocation(ip: string): IpLocation | null {
  if (!ip) {
    return null;
  }
  const result = geoip.lookup(ip);
  // Private/reserved ranges (10.x, 127.x, localhost) and unresolvable IPs
  // both come back null from geoip-lite -- no country to report either way.
  if (!result || !result.country) {
    return null;
  }
  return { city: result.city, country: result.country };
}

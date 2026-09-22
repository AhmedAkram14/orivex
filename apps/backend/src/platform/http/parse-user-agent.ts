import { UAParser } from 'ua-parser-js';

export interface ParsedUserAgent {
  browser: string | undefined;
  browserVersion: string | undefined;
  os: string | undefined;
  deviceType: string | undefined;
  displayName: string;
  isUnrecognizedClient: boolean;
  raw: string | undefined;
}

const UNKNOWN_DEVICE_LABEL = 'Unknown device';

// Presentation-layer enrichment computed on read, never stored -- the raw
// UA string remains the source of truth (Session/SecurityEvent), so a
// parser upgrade or bug fix improves every past session's display for free
// instead of requiring a backfill.
export function parseUserAgent(rawUa: string | undefined): ParsedUserAgent {
  const result = new UAParser(rawUa ?? '').getResult();
  const browser = result.browser.name;
  const os = result.os.name;
  // ua-parser-js resolves an empty {} for every field it can't identify --
  // covers curl/wget/python-requests/Postman/empty UA alike, no denylist
  // of client names to maintain.
  const isUnrecognizedClient = !browser;

  const displayName = browser && os ? `${browser} on ${os}` : (browser ?? os ?? UNKNOWN_DEVICE_LABEL);

  return {
    browser,
    browserVersion: result.browser.version,
    os,
    deviceType: result.device.type,
    displayName,
    isUnrecognizedClient,
    raw: rawUa,
  };
}

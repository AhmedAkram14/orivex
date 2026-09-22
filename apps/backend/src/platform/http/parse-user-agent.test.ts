import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseUserAgent } from './parse-user-agent.js';

const CHROME_WINDOWS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IPHONE_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('parseUserAgent', () => {
  it('parses a real browser UA into browser/os/displayName', () => {
    const result = parseUserAgent(CHROME_WINDOWS_UA);
    assert.equal(result.browser, 'Chrome');
    assert.equal(result.os, 'Windows');
    assert.equal(result.displayName, 'Chrome on Windows');
    assert.equal(result.isUnrecognizedClient, false);
    assert.equal(result.raw, CHROME_WINDOWS_UA);
  });

  it('detects a mobile device type', () => {
    const result = parseUserAgent(IPHONE_SAFARI_UA);
    assert.equal(result.deviceType, 'mobile');
  });

  it('flags curl as an unrecognized client', () => {
    const result = parseUserAgent('curl/8.4.0');
    assert.equal(result.isUnrecognizedClient, true);
    assert.equal(result.displayName, 'Unknown device');
  });

  it('flags wget as an unrecognized client', () => {
    const result = parseUserAgent('Wget/1.21.3');
    assert.equal(result.isUnrecognizedClient, true);
  });

  it('flags python-requests as an unrecognized client', () => {
    const result = parseUserAgent('python-requests/2.31.0');
    assert.equal(result.isUnrecognizedClient, true);
  });

  it('flags Postman as an unrecognized client', () => {
    const result = parseUserAgent('PostmanRuntime/7.36.0');
    assert.equal(result.isUnrecognizedClient, true);
  });

  it('flags an empty user agent as unrecognized', () => {
    const result = parseUserAgent('');
    assert.equal(result.isUnrecognizedClient, true);
    assert.equal(result.displayName, 'Unknown device');
  });

  it('flags an undefined user agent as unrecognized', () => {
    const result = parseUserAgent(undefined);
    assert.equal(result.isUnrecognizedClient, true);
  });
});

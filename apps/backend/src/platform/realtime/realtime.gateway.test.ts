import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AccessTokenClaims, JwtSignerPort } from '../../modules/authentication/application/ports/jwt-signer.port.js';

import { RealtimeGateway } from './realtime.gateway.js';

class FakeJwtSigner implements JwtSignerPort {
  constructor(private readonly validToken: string, private readonly claims: AccessTokenClaims) {}
  async sign(): Promise<never> {
    throw new Error('not used in this test');
  }
  async verify(token: string): Promise<AccessTokenClaims> {
    if (token !== this.validToken) {
      throw new Error('invalid token');
    }
    return this.claims;
  }
}

class FakeLogger {
  public errors: unknown[] = [];
  error(message: unknown, ...rest: unknown[]): void {
    this.errors.push({ message, rest });
  }
}

class FakeSocket {
  public joined: string[] = [];
  public disconnected = false;
  public data: Record<string, unknown> = {};
  constructor(public handshake: { auth: Record<string, unknown> }) {}
  async join(room: string): Promise<void> {
    this.joined.push(room);
  }
  disconnect(): void {
    this.disconnected = true;
  }
}

class FakeServer {
  public emittedTo: { room: string; event: string; payload: unknown }[] = [];
  to(room: string) {
    return {
      emit: (event: string, payload: unknown) => {
        this.emittedTo.push({ room, event, payload });
      },
    };
  }
}

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

describe('RealtimeGateway', () => {
  it('joins the account-specific room on a valid token', async () => {
    const jwtSigner = new FakeJwtSigner('good-token', { accountId: ACCOUNT_ID, role: 'patient' });
    const gateway = new RealtimeGateway(jwtSigner, new FakeLogger() as never);
    const socket = new FakeSocket({ auth: { token: 'good-token' } });

    await gateway.handleConnection(socket as never);

    assert.deepEqual(socket.joined, [`account:${ACCOUNT_ID}`]);
    assert.equal(socket.disconnected, false);
  });

  it('disconnects a socket with no token', async () => {
    const jwtSigner = new FakeJwtSigner('good-token', { accountId: ACCOUNT_ID, role: 'patient' });
    const gateway = new RealtimeGateway(jwtSigner, new FakeLogger() as never);
    const socket = new FakeSocket({ auth: {} });

    await gateway.handleConnection(socket as never);

    assert.equal(socket.disconnected, true);
    assert.equal(socket.joined.length, 0);
  });

  it('disconnects a socket with an invalid/expired token, never joining a room', async () => {
    const jwtSigner = new FakeJwtSigner('good-token', { accountId: ACCOUNT_ID, role: 'patient' });
    const gateway = new RealtimeGateway(jwtSigner, new FakeLogger() as never);
    const socket = new FakeSocket({ auth: { token: 'stolen-token' } });

    await gateway.handleConnection(socket as never);

    assert.equal(socket.disconnected, true);
    assert.equal(socket.joined.length, 0);
  });

  it('emitToAccount only reaches that account\'s own room, never a broadcast', () => {
    const jwtSigner = new FakeJwtSigner('good-token', { accountId: ACCOUNT_ID, role: 'patient' });
    const gateway = new RealtimeGateway(jwtSigner, new FakeLogger() as never);
    const server = new FakeServer();
    (gateway as unknown as { server: FakeServer }).server = server;

    gateway.emitToAccount(ACCOUNT_ID, 'notification.created', { title: 'Hello' });

    assert.equal(server.emittedTo.length, 1);
    assert.equal(server.emittedTo[0].room, `account:${ACCOUNT_ID}`);
    assert.equal(server.emittedTo[0].event, 'notification.created');
    assert.deepEqual(server.emittedTo[0].payload, { title: 'Hello' });
  });

  it('logs (and never throws) when emitToAccount is called before the server is initialized', () => {
    const jwtSigner = new FakeJwtSigner('good-token', { accountId: ACCOUNT_ID, role: 'patient' });
    const logger = new FakeLogger();
    const gateway = new RealtimeGateway(jwtSigner, logger as never);

    gateway.emitToAccount(ACCOUNT_ID, 'notification.created', {});

    assert.equal(logger.errors.length, 1);
  });

  describe('handleTyping (Messages Page Overhaul, Phase 2)', () => {
    const RECIPIENT_ID = '22222222-2222-4222-8222-222222222222';
    const SPOOFED_ID = '99999999-9999-4999-8999-999999999999';

    it('emits to the named recipient with fromAccountId taken from the socket\'s own authenticated identity, never the payload', async () => {
      const jwtSigner = new FakeJwtSigner('good-token', { accountId: ACCOUNT_ID, role: 'patient' });
      const gateway = new RealtimeGateway(jwtSigner, new FakeLogger() as never);
      const server = new FakeServer();
      (gateway as unknown as { server: FakeServer }).server = server;
      const socket = new FakeSocket({ auth: { token: 'good-token' } });
      await gateway.handleConnection(socket as never);

      // A client-supplied `fromAccountId`/spoofed identity in the payload
      // must be ignored entirely -- the handler doesn't even read such a
      // field, only `threadId`/`recipientAccountId`.
      const spoofedPayload = { threadId: 'thread-1', recipientAccountId: RECIPIENT_ID, fromAccountId: SPOOFED_ID };
      gateway.handleTyping(socket as never, spoofedPayload as never);

      assert.equal(server.emittedTo.length, 1);
      assert.equal(server.emittedTo[0].room, `account:${RECIPIENT_ID}`);
      assert.equal(server.emittedTo[0].event, 'messaging.typing');
      assert.deepEqual(server.emittedTo[0].payload, { threadId: 'thread-1', fromAccountId: ACCOUNT_ID });
    });

    it('does nothing for a socket that never authenticated (no accountId on socket.data)', () => {
      const jwtSigner = new FakeJwtSigner('good-token', { accountId: ACCOUNT_ID, role: 'patient' });
      const gateway = new RealtimeGateway(jwtSigner, new FakeLogger() as never);
      const server = new FakeServer();
      (gateway as unknown as { server: FakeServer }).server = server;
      const socket = new FakeSocket({ auth: {} });

      gateway.handleTyping(socket as never, { threadId: 'thread-1', recipientAccountId: RECIPIENT_ID });

      assert.equal(server.emittedTo.length, 0);
    });

    it('does nothing when threadId or recipientAccountId is missing', async () => {
      const jwtSigner = new FakeJwtSigner('good-token', { accountId: ACCOUNT_ID, role: 'patient' });
      const gateway = new RealtimeGateway(jwtSigner, new FakeLogger() as never);
      const server = new FakeServer();
      (gateway as unknown as { server: FakeServer }).server = server;
      const socket = new FakeSocket({ auth: { token: 'good-token' } });
      await gateway.handleConnection(socket as never);

      gateway.handleTyping(socket as never, { threadId: 'thread-1' });
      gateway.handleTyping(socket as never, { recipientAccountId: RECIPIENT_ID });

      assert.equal(server.emittedTo.length, 0);
    });
  });
});

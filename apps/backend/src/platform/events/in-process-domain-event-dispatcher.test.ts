import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DomainEvent } from '../../shared/domain/domain-event.js';

import { InProcessDomainEventDispatcher } from './in-process-domain-event-dispatcher.js';

class TestEvent extends DomainEvent {
  readonly eventName = 'test.event';
  constructor() {
    super();
  }
}

describe('InProcessDomainEventDispatcher', () => {
  it('awaits an async subscriber before dispatch() resolves', async () => {
    const dispatcher = new InProcessDomainEventDispatcher();
    let writeCompleted = false;

    dispatcher.subscribe('test.event', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      writeCompleted = true;
    });

    await dispatcher.dispatch([new TestEvent()]);

    assert.equal(writeCompleted, true);
  });

  it('invokes multiple subscribers for the same event, in registration order', async () => {
    const dispatcher = new InProcessDomainEventDispatcher();
    const order: number[] = [];

    dispatcher.subscribe('test.event', async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push(1);
    });
    dispatcher.subscribe('test.event', () => {
      order.push(2);
    });

    await dispatcher.dispatch([new TestEvent()]);

    assert.deepEqual(order, [1, 2]);
  });

  it('does not invoke handlers subscribed to a different event name', async () => {
    const dispatcher = new InProcessDomainEventDispatcher();
    let invoked = false;

    dispatcher.subscribe('other.event', () => {
      invoked = true;
    });

    await dispatcher.dispatch([new TestEvent()]);

    assert.equal(invoked, false);
  });
});

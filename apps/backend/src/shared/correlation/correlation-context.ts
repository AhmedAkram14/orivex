import { AsyncLocalStorage } from 'node:async_hooks';

export interface CorrelationStore {
  requestId: string;
}

const storage = new AsyncLocalStorage<CorrelationStore>();

export const correlationContext = {
  run<T>(store: CorrelationStore, fn: () => T): T {
    return storage.run(store, fn);
  },
  getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
};

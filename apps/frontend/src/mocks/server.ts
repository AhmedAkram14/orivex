import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';

/** For Vitest — a test file opts in with `server.listen()`/`server.use(...)` rather than this running globally for every test (most component tests don't touch the network at all). */
export const server = setupServer(...handlers);

// Matches MessageThreadController's own @Controller('message-threads') shape exactly.
export const MESSAGING_PATHS = {
  threads: () => '/message-threads',
  messages: (threadId: string) => `/message-threads/${threadId}/messages`,
  markRead: (threadId: string) => `/message-threads/${threadId}/read`,
} as const;

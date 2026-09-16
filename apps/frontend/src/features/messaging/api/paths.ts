// Matches MessageThreadController's own @Controller('message-threads') shape exactly.
export const MESSAGING_PATHS = {
  threads: () => '/message-threads',
  unreadCount: () => '/message-threads/unread-count',
  messages: (threadId: string) => `/message-threads/${threadId}/messages`,
  appointments: (threadId: string) => `/message-threads/${threadId}/appointments`,
  markRead: (threadId: string) => `/message-threads/${threadId}/read`,
} as const;

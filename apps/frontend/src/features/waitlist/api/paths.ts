// Matches WaitlistController's own @Controller('waitlist') shape exactly.
export const WAITLIST_PATHS = {
  entries: () => '/waitlist',
  entry: (id: string) => `/waitlist/${id}`,
} as const;

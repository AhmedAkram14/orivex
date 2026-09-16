/**
 * Messages Page Overhaul (Phase 2): a plain module-level ref, not React
 * state/context -- the ONLY thing this needs to answer is "is thread X the
 * one currently open in the panel right now," for the realtime socket
 * handler (`use-realtime-socket.ts`) to decide whether an incoming
 * `message.sent` needs a background-thread toast or not. `ThreadPanel`
 * writes to it on mount/threadId-change/unmount; nothing else reads or
 * writes it. Deliberately not the URL-state mechanism Phase 3 adds for
 * `?thread=` -- that's for deep-linking/navigation, this is only for this
 * one realtime decision.
 */
let openThreadId: string | undefined;

export function setOpenThreadId(threadId: string | undefined): void {
  openThreadId = threadId;
}

export function getOpenThreadId(): string | undefined {
  return openThreadId;
}

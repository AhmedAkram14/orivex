/** Matches MessageThreadResponseDto exactly (MessageThreadController). */
export interface MessageThread {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Composed by the backend controller -- the count of messages the caller hasn't read yet. Present on the inbox list (`GET /message-threads`), absent when a thread is first created (`POST /message-threads`). */
  unreadCount?: number;
}

/** Matches MessageResponseDto exactly (MessageThreadController). */
export interface Message {
  id: string;
  threadId: string;
  senderAccountId: string;
  body: string;
  attachmentAssetId: string | null;
  /** ISO timestamp, or null while unread. */
  readAt: string | null;
  /** ISO timestamp. */
  createdAt: string;
}

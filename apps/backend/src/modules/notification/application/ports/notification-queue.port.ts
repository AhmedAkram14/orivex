export interface EnqueueAppointmentReminderJob {
  accountId: string;
  appointmentId: string;
  // ISO string -- the reminder job payload crosses a serialization boundary
  // (Redis), so a Date instance would silently become a string anyway;
  // making that explicit here avoids a false sense of type safety.
  scheduledAt: string;
  delayMs: number;
}

// Port only (docs/06-system-architecture.md Section 11: "every external
// dependency is accessed through a dedicated adapter... implementing a
// stable internal interface"), matching PaymentGatewayPort/
// RoomTokenGeneratorPort's exact shape.
//
// BullMQ (backed by Redis) is the bound adapter as of the ORIVEX Roadmap
// 2.0 implementation program's Stage 3 -- NotificationModule falls back to
// NotConfiguredNotificationQueueAdapter whenever REDIS_URL is unset, so the
// app keeps booting cleanly with zero queue infrastructure configured,
// exactly as PaymentModule/ConsultationModule already do for their own
// external providers.
export interface NotificationQueuePort {
  enqueueAppointmentReminder(job: EnqueueAppointmentReminderJob): Promise<void>;
  // Used only by HealthController's GET /health/readiness (Production
  // Readiness Audit) -- resolves when the underlying queue/broker is
  // actually reachable, rejects otherwise. Mirrors ObjectStoragePort's own
  // checkConnectivity() exactly.
  checkConnectivity(): Promise<void>;
}

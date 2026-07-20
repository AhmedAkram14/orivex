// Read-only surface over already-real env-var-driven flags/provider
// configuration (docs/06-system-architecture.md's Stage 4 System Monitoring
// note). No new flags introduced here -- purely a visibility screen over
// what env.schema.ts already declares.
export class FeatureFlagsResponseDto {
  observabilityEnabled!: boolean;
  openApiEnabled!: boolean;
  paymentGatewayConfigured!: boolean;
  telemedicineConfigured!: boolean;
  emailProviderConfigured!: boolean;
  notificationQueueConfigured!: boolean;
}

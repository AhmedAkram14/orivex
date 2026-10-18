import type { WorkQueueSnapshot } from '../../application/ports/admin-queue-query.port.js';
import type { AdminOverviewResult } from '../../application/use-cases/get-admin-overview/get-admin-overview.use-case.js';

export class WorkQueueSnapshotDto {
  count!: number;
  /** ISO 8601; null when the queue is empty or no entry time is recorded (flagged reviews). */
  oldestWaitingSince!: string | null;

  static fromSnapshot(snapshot: WorkQueueSnapshot): WorkQueueSnapshotDto {
    return Object.assign(new WorkQueueSnapshotDto(), {
      count: snapshot.count,
      oldestWaitingSince: snapshot.oldestWaitingSince ? snapshot.oldestWaitingSince.toISOString() : null,
    });
  }
}

export class AdminOverviewNeedsAttentionDto {
  pendingVerifications!: WorkQueueSnapshotDto;
  openDisputes!: WorkQueueSnapshotDto;
  flaggedReviews!: WorkQueueSnapshotDto;
}

export class AdminOverviewHealthDto {
  appointmentsToday!: number;
  appointmentsLast7Days!: number;
  completionRate!: number;
  cancellationRate!: number;
  noShowRate!: number;
  revenueToday!: number;
  revenueChangePercent!: number | null;
  failedPayments!: number;
  activeDoctors!: number;
  activePatients!: number;
  activeWindowDays!: number;
}

export class AdminOverviewResponseDto {
  generatedAt!: string;
  needsAttention!: AdminOverviewNeedsAttentionDto;
  averageVerificationReviewHours!: number | null;
  health!: AdminOverviewHealthDto;

  static fromResult(result: AdminOverviewResult): AdminOverviewResponseDto {
    return Object.assign(new AdminOverviewResponseDto(), {
      generatedAt: result.generatedAt.toISOString(),
      needsAttention: {
        pendingVerifications: WorkQueueSnapshotDto.fromSnapshot(result.needsAttention.pendingVerifications),
        openDisputes: WorkQueueSnapshotDto.fromSnapshot(result.needsAttention.openDisputes),
        flaggedReviews: WorkQueueSnapshotDto.fromSnapshot(result.needsAttention.flaggedReviews),
      },
      averageVerificationReviewHours: result.averageVerificationReviewHours,
      health: { ...result.health },
    });
  }
}

import type { ConsultationFeedback as PrismaConsultationFeedback } from '@prisma/client';

import { ConsultationFeedback } from '../../domain/entities/consultation-feedback.entity.js';

export function toDomainConsultationFeedback(row: PrismaConsultationFeedback): ConsultationFeedback {
  return ConsultationFeedback.reconstitute({
    id: row.id,
    consultationSessionId: row.consultationSessionId,
    patientId: row.patientId,
    doctorId: row.doctorId,
    rating: row.rating,
    comment: row.comment ?? undefined,
    createdAt: row.createdAt,
  });
}

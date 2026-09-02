import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ClinicalNote } from '../../domain/entities/clinical-note.entity.js';
import type { ClinicalNoteRepository } from '../../domain/repositories/clinical-note.repository.js';

import { toDomainClinicalNote } from './clinical-note.mapper.js';

@Injectable()
export class PrismaClinicalNoteRepository implements ClinicalNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ClinicalNote | null> {
    const row = await this.prisma.clinicalNote.findUnique({ where: { id } });
    return row ? toDomainClinicalNote(row) : null;
  }

  async findByConsultationSessionId(consultationSessionId: string): Promise<ClinicalNote[]> {
    const rows = await this.prisma.clinicalNote.findMany({ where: { consultationSessionId } });
    return rows.map((row) => toDomainClinicalNote(row));
  }

  // ClinicalNote is fully immutable (docs/07-domain-data-model.md's "never
  // rewrite" rule) -- save() only ever creates; there is no domain method
  // that mutates an existing note.
  async save(note: ClinicalNote): Promise<void> {
    await this.prisma.clinicalNote.create({
      data: {
        id: note.getId(),
        consultationSessionId: note.getConsultationSessionId(),
        authoringDoctorId: note.getAuthoringDoctorId(),
        content: note.getContent(),
        addendumOfNoteId: note.getAddendumOfNoteId() ?? null,
        createdAt: note.getCreatedAt(),
      },
    });
  }
}

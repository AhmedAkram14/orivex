import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { CheckIdentityVerificationStatusUseCase } from '../../../../trust/application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { VerificationSubjectType } from '../../../../trust/domain/enums/verification-subject-type.enum.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';
import { PreReviewThresholdService } from '../../services/pre-review-threshold.service.js';

import type { AuthorArticleCommand } from './author-article.command.js';

// I13 -- Knowledge Center (docs/01.1-prd-update.md §6): "all published
// content must be attributed to a Syndicate-verified doctor... the trust
// value of this module collapses immediately if content quality/
// authorship isn't controlled" -- enforced here via TrustModule's own
// exported CheckIdentityVerificationStatusUseCase, never a separate,
// invented verification check. Verification gates BOTH publishing and
// saving a draft (Knowledge Center Hardening Phase 1) -- a non-verified
// doctor shouldn't be able to accumulate drafts either, so this check runs
// before the saveAsDraft branch, never skippable via that path.
export class AuthorArticleUseCase {
  constructor(
    private readonly knowledgeArticleRepository: KnowledgeArticleRepository,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly checkIdentityVerificationStatusUseCase: CheckIdentityVerificationStatusUseCase,
    private readonly preReviewThresholdService: PreReviewThresholdService,
  ) {}

  async execute(command: AuthorArticleCommand): Promise<KnowledgeArticle> {
    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId });
    if (!doctorProfile) {
      throw new NotFoundError('No doctor profile exists for this account.');
    }

    const verification = await this.checkIdentityVerificationStatusUseCase.execute({
      subjectType: VerificationSubjectType.Doctor,
      subjectAccountId: command.callerAccountId,
    });
    if (!verification.isVerified) {
      throw new ForbiddenError('Only a Syndicate-verified doctor may publish Knowledge Center content.');
    }

    if (command.saveAsDraft) {
      const draft = KnowledgeArticle.author({
        authoringDoctorId: doctorProfile.getId(),
        title: command.title,
        body: command.body,
        language: command.language,
        // Knowledge Center Hardening Phase 1, decision 3: auto-tag every
        // article with the authoring doctor's own current specialty.
        specialtyId: doctorProfile.getSpecialtyId(),
        sourcesText: command.sourcesText,
        saveAsDraft: true,
      });
      await this.knowledgeArticleRepository.save(draft);
      return draft;
    }

    const requiresPreReview = await this.preReviewThresholdService.computeRequiresPreReview(doctorProfile.getId());
    const article = KnowledgeArticle.author({
      authoringDoctorId: doctorProfile.getId(),
      title: command.title,
      body: command.body,
      language: command.language,
      specialtyId: doctorProfile.getSpecialtyId(),
      sourcesText: command.sourcesText,
      requiresPreReview,
    });

    await this.knowledgeArticleRepository.save(article);
    return article;
  }
}

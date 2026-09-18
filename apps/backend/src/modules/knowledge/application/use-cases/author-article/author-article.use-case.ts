import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { CheckIdentityVerificationStatusUseCase } from '../../../../trust/application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { VerificationSubjectType } from '../../../../trust/domain/enums/verification-subject-type.enum.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import { KnowledgeArticleLanguage } from '../../../domain/enums/knowledge-article-language.enum.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import type { AuthorArticleCommand } from './author-article.command.js';

// I13 -- Knowledge Center (docs/01.1-prd-update.md §6): "all published
// content must be attributed to a Syndicate-verified doctor... the trust
// value of this module collapses immediately if content quality/
// authorship isn't controlled" -- enforced here via TrustModule's own
// exported CheckIdentityVerificationStatusUseCase, never a separate,
// invented verification check. A doctor's first 3 articles ever
// Published/Archived require pre-publication admin review; from the 4th
// onward, an article publishes immediately but stays subject to
// post-publication spot-review (ModerateArticleUseCase can still archive
// it later) -- both halves of the PRD's own "lightweight pre-publication
// review... transitioning to post-publication spot-review" rule.
const PRE_REVIEW_THRESHOLD = 3;

export class AuthorArticleUseCase {
  constructor(
    private readonly knowledgeArticleRepository: KnowledgeArticleRepository,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
    private readonly checkIdentityVerificationStatusUseCase: CheckIdentityVerificationStatusUseCase,
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

    const priorPublishedCount = await this.knowledgeArticleRepository.countEverPublishedByAuthor(doctorProfile.getId());
    const article = KnowledgeArticle.author({
      authoringDoctorId: doctorProfile.getId(),
      title: command.title,
      body: command.body,
      // Knowledge Center Hardening Phase 0: the entity now requires language/
      // specialtyId on every article (decisions 3/5). specialtyId is
      // auto-tagged from the doctor's own profile per decision 3. language
      // is temporarily defaulted to Arabic here -- Phase 1 widens
      // AuthorArticleCommand with a real, caller-supplied language field;
      // this default is only a stopgap to keep this use case compiling
      // against the widened entity, not a product decision.
      language: KnowledgeArticleLanguage.Arabic,
      specialtyId: doctorProfile.getSpecialtyId(),
      requiresPreReview: priorPublishedCount < PRE_REVIEW_THRESHOLD,
    });

    await this.knowledgeArticleRepository.save(article);
    return article;
  }
}

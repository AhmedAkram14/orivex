import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { KnowledgeArticleStatus } from '../../../domain/enums/knowledge-article-status.enum.js';
import type { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

export interface GetArticleByIdQuery {
  articleId: string;
  callerAccountId: string;
}

// I13 -- Knowledge Center: a Published article is visible to anyone (the
// authenticated patient/doctor feed); a PendingReview/Rejected/Archived
// one is visible only to its own authoring doctor -- checking their own
// submission's status -- never a distinguishing 403 for anyone else, same
// "never leak existence" convention as every other single-resource read
// in this codebase.
export class GetArticleByIdUseCase {
  constructor(
    private readonly knowledgeArticleRepository: KnowledgeArticleRepository,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(query: GetArticleByIdQuery): Promise<KnowledgeArticle> {
    const article = await this.knowledgeArticleRepository.findById(query.articleId);
    if (!article) {
      throw new NotFoundError(`KnowledgeArticle "${query.articleId}" not found.`);
    }
    if (article.getStatus() === KnowledgeArticleStatus.Published) {
      // Knowledge Center Hardening Phase 1, decision 4/7: a Published
      // article's read increments its view count, excluding the authoring
      // doctor's own reads of their own article. Reuses the same
      // getDoctorProfileByAccountIdUseCase this use case already depends
      // on for the non-Published branch's ownership check below, rather
      // than inventing a second profile-id-to-account-id lookup -- there's
      // only one party (the author) to compare the caller against here,
      // not two, so no AppointmentPartyResolver-style shared resolver is
      // warranted. query.callerAccountId is always populated in practice
      // (every route on this controller sits behind JwtAuthGuard), but the
      // `?? null` below still degrades safely to "not the author" -- never
      // a crash -- if it were ever falsy.
      const callerDoctorProfile = query.callerAccountId
        ? await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId })
        : null;
      const callerIsAuthor = callerDoctorProfile !== null && callerDoctorProfile.getId() === article.getAuthoringDoctorId();
      if (!callerIsAuthor) {
        article.recordView();
        await this.knowledgeArticleRepository.update(article);
      }
      return article;
    }

    const doctorProfile = await this.getDoctorProfileByAccountIdUseCase.execute({ accountId: query.callerAccountId });
    if (!doctorProfile || doctorProfile.getId() !== article.getAuthoringDoctorId()) {
      throw new NotFoundError(`KnowledgeArticle "${query.articleId}" not found.`);
    }
    return article;
  }
}

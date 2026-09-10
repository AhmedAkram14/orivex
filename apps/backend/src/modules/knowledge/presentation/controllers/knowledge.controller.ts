import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { Roles } from '../../../authentication/presentation/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../authentication/presentation/guards/roles.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import { AuthorArticleCommand } from '../../application/use-cases/author-article/author-article.command.js';
import { AuthorArticleUseCase } from '../../application/use-cases/author-article/author-article.use-case.js';
import { GetArticleByIdUseCase } from '../../application/use-cases/get-article-by-id/get-article-by-id.use-case.js';
import { ListMyArticlesUseCase } from '../../application/use-cases/list-my-articles/list-my-articles.use-case.js';
import { ListPublishedArticlesQuery } from '../../application/use-cases/list-published-articles/list-published-articles.query.js';
import { ListPublishedArticlesUseCase } from '../../application/use-cases/list-published-articles/list-published-articles.use-case.js';
import { FollowDoctorCommand } from '../../application/use-cases/follow-doctor/follow-doctor.command.js';
import { FollowDoctorUseCase } from '../../application/use-cases/follow-doctor/follow-doctor.use-case.js';
import { UnfollowDoctorCommand } from '../../application/use-cases/unfollow-doctor/unfollow-doctor.command.js';
import { UnfollowDoctorUseCase } from '../../application/use-cases/unfollow-doctor/unfollow-doctor.use-case.js';
import { ListFollowedDoctorsUseCase } from '../../application/use-cases/list-followed-doctors/list-followed-doctors.use-case.js';
import { SaveArticleCommand } from '../../application/use-cases/save-article/save-article.command.js';
import { SaveArticleUseCase } from '../../application/use-cases/save-article/save-article.use-case.js';
import { UnsaveArticleCommand } from '../../application/use-cases/unsave-article/unsave-article.command.js';
import { UnsaveArticleUseCase } from '../../application/use-cases/unsave-article/unsave-article.use-case.js';
import { ListSavedArticlesUseCase } from '../../application/use-cases/list-saved-articles/list-saved-articles.use-case.js';
import { ArticleSaveResponseDto } from '../dto/article-save-response.dto.js';
import { AuthorArticleRequestDto } from '../dto/author-article-request.dto.js';
import { DoctorFollowResponseDto } from '../dto/doctor-follow-response.dto.js';
import { KnowledgeArticleResponseDto } from '../dto/knowledge-article-response.dto.js';
import { ListArticlesQueryDto } from '../dto/list-articles-query.dto.js';
import { ListKnowledgeArticlesResponseDto } from '../dto/list-knowledge-articles-response.dto.js';
import { mapKnowledgeError } from '../mappers/knowledge-exception.mapper.js';

// I13 -- Knowledge Center (docs/01.1-prd-update.md §6). Class-level
// @Roles(Patient, Doctor) covers the read routes both sides genuinely
// share (browsing the published feed, reading one article); authoring and
// the patient-only follow/save actions each override with their own
// method-level @Roles(), matching RolesGuard's own documented
// getAllAndOverride precedence (a handler decorator wins over the class
// one) -- the same one-controller shape MessageThreadController uses for
// its own shared Patient+Doctor routes, extended here since this module's
// actions genuinely split by role instead of being uniform.
@Controller('knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.Patient, AccountRole.Doctor)
export class KnowledgeController {
  constructor(
    private readonly authorArticleUseCase: AuthorArticleUseCase,
    private readonly listMyArticlesUseCase: ListMyArticlesUseCase,
    private readonly listPublishedArticlesUseCase: ListPublishedArticlesUseCase,
    private readonly getArticleByIdUseCase: GetArticleByIdUseCase,
    private readonly saveArticleUseCase: SaveArticleUseCase,
    private readonly unsaveArticleUseCase: UnsaveArticleUseCase,
    private readonly listSavedArticlesUseCase: ListSavedArticlesUseCase,
    private readonly followDoctorUseCase: FollowDoctorUseCase,
    private readonly unfollowDoctorUseCase: UnfollowDoctorUseCase,
    private readonly listFollowedDoctorsUseCase: ListFollowedDoctorsUseCase,
  ) {}

  @Post('articles')
  @HttpCode(HttpStatus.CREATED)
  @Roles(AccountRole.Doctor)
  async author(
    @CurrentUser() user: AccessTokenClaims,
    @Body() body: AuthorArticleRequestDto,
  ): Promise<ResponseEnvelope<KnowledgeArticleResponseDto>> {
    try {
      const article = await this.authorArticleUseCase.execute(
        new AuthorArticleCommand({ callerAccountId: user.accountId, title: body.title, body: body.body }),
      );
      return envelope(KnowledgeArticleResponseDto.fromDomain(article));
    } catch (error) {
      throw mapKnowledgeError(error);
    }
  }

  // Registered before the ':id' route below so 'mine' is never captured as
  // a UUID param -- same literal-before-parametric ordering this codebase
  // relies on everywhere else a static and a dynamic segment could collide.
  @Get('articles/mine')
  @Roles(AccountRole.Doctor)
  async listMine(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<KnowledgeArticleResponseDto[]>> {
    const articles = await this.listMyArticlesUseCase.execute({ callerAccountId: user.accountId });
    return envelope(articles.map((article) => KnowledgeArticleResponseDto.fromDomain(article)));
  }

  @Get('articles')
  async listPublished(@Query() query: ListArticlesQueryDto): Promise<ResponseEnvelope<ListKnowledgeArticlesResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.listPublishedArticlesUseCase.execute(
      new ListPublishedArticlesQuery({ page, limit, doctorId: query.doctorId }),
    );
    return envelope(ListKnowledgeArticlesResponseDto.fromResult(result, page, limit));
  }

  @Get('articles/:id')
  async getById(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<KnowledgeArticleResponseDto>> {
    const article = await this.getArticleByIdUseCase.execute({ articleId: id, callerAccountId: user.accountId });
    return envelope(KnowledgeArticleResponseDto.fromDomain(article));
  }

  @Post('articles/:id/save')
  @HttpCode(HttpStatus.CREATED)
  @Roles(AccountRole.Patient)
  async save(
    @CurrentUser() user: AccessTokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseEnvelope<ArticleSaveResponseDto>> {
    const save = await this.saveArticleUseCase.execute(
      new SaveArticleCommand({ callerAccountId: user.accountId, articleId: id }),
    );
    return envelope(ArticleSaveResponseDto.fromDomain(save));
  }

  @Delete('articles/:id/save')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(AccountRole.Patient)
  async unsave(@CurrentUser() user: AccessTokenClaims, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.unsaveArticleUseCase.execute(new UnsaveArticleCommand({ callerAccountId: user.accountId, articleId: id }));
  }

  @Get('saved-articles')
  @Roles(AccountRole.Patient)
  async listSaved(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<ArticleSaveResponseDto[]>> {
    const saves = await this.listSavedArticlesUseCase.execute({ callerAccountId: user.accountId });
    return envelope(saves.map((save) => ArticleSaveResponseDto.fromDomain(save)));
  }

  @Post('doctors/:doctorId/follow')
  @HttpCode(HttpStatus.CREATED)
  @Roles(AccountRole.Patient)
  async follow(
    @CurrentUser() user: AccessTokenClaims,
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
  ): Promise<ResponseEnvelope<DoctorFollowResponseDto>> {
    const follow = await this.followDoctorUseCase.execute(
      new FollowDoctorCommand({ callerAccountId: user.accountId, doctorId }),
    );
    return envelope(DoctorFollowResponseDto.fromDomain(follow));
  }

  @Delete('doctors/:doctorId/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(AccountRole.Patient)
  async unfollow(
    @CurrentUser() user: AccessTokenClaims,
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
  ): Promise<void> {
    await this.unfollowDoctorUseCase.execute(new UnfollowDoctorCommand({ callerAccountId: user.accountId, doctorId }));
  }

  @Get('followed-doctors')
  @Roles(AccountRole.Patient)
  async listFollowed(@CurrentUser() user: AccessTokenClaims): Promise<ResponseEnvelope<DoctorFollowResponseDto[]>> {
    const follows = await this.listFollowedDoctorsUseCase.execute({ callerAccountId: user.accountId });
    return envelope(follows.map((follow) => DoctorFollowResponseDto.fromDomain(follow)));
  }
}

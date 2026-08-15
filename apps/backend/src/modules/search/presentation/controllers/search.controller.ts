import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { envelope, type ResponseEnvelope } from '../../../../shared/http/response-envelope.js';
import { CurrentUser } from '../../../authentication/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../../authentication/presentation/guards/jwt-auth.guard.js';
import type { AccessTokenClaims } from '../../../authentication/application/ports/jwt-signer.port.js';
import { GlobalSearchUseCase } from '../../application/use-cases/global-search/global-search.use-case.js';
import { SearchQueryDto } from '../dto/search-query.dto.js';
import { SearchResponseDto } from '../dto/search-response.dto.js';

const DEFAULT_LIMIT = 5;

// ORIVEX Roadmap Phase 2 -- Real Global Search. Deliberately NOT @Roles-
// locked: every authenticated role may call this endpoint, but what it
// returns is scoped per-role inside GlobalSearchUseCase, never post-filtered
// here (see search.module.ts's header comment for the full authorization
// matrix).
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly globalSearchUseCase: GlobalSearchUseCase) {}

  @Get()
  async search(
    @CurrentUser() user: AccessTokenClaims,
    @Query() query: SearchQueryDto,
  ): Promise<ResponseEnvelope<SearchResponseDto>> {
    const result = await this.globalSearchUseCase.execute({
      accountId: user.accountId,
      role: user.role,
      q: query.q,
      type: query.type,
      limit: query.limit ?? DEFAULT_LIMIT,
    });
    return envelope(SearchResponseDto.fromResult(result));
  }
}

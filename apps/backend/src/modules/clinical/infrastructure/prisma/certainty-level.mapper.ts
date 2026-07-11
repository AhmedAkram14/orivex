import { CertaintyLevel as PrismaCertaintyLevel } from '@prisma/client';

import { CertaintyLevel } from '../../domain/enums/certainty-level.enum.js';

// Prisma's enum is UPPER_SNAKE (database convention); the domain enum is
// lower_snake, matching docs/12-openapi.md's HealthGraphNode.certaintyLevel
// exactly. This is the sole place the two vocabularies are translated.
const DOMAIN_TO_PRISMA: Record<CertaintyLevel, PrismaCertaintyLevel> = {
  [CertaintyLevel.Suspected]: PrismaCertaintyLevel.SUSPECTED,
  [CertaintyLevel.Confirmed]: PrismaCertaintyLevel.CONFIRMED,
  [CertaintyLevel.RuledOut]: PrismaCertaintyLevel.RULED_OUT,
};

const PRISMA_TO_DOMAIN: Record<PrismaCertaintyLevel, CertaintyLevel> = {
  [PrismaCertaintyLevel.SUSPECTED]: CertaintyLevel.Suspected,
  [PrismaCertaintyLevel.CONFIRMED]: CertaintyLevel.Confirmed,
  [PrismaCertaintyLevel.RULED_OUT]: CertaintyLevel.RuledOut,
};

export function toPrismaCertaintyLevel(value: CertaintyLevel): PrismaCertaintyLevel {
  return DOMAIN_TO_PRISMA[value];
}

export function toDomainCertaintyLevel(value: PrismaCertaintyLevel): CertaintyLevel {
  return PRISMA_TO_DOMAIN[value];
}

import { IsEnum } from 'class-validator';

import { JourneyStage } from '../../domain/enums/journey-stage.enum.js';

// Journey stage-advance fix (ORIVEX Remaining Work Audit, P0 C5). Field
// name matches docs/12-openapi.md's HealthJourney.stage exactly -- not
// separately documented as a request body yet (no PATCH /journeys/{id}
// endpoint exists in the spec), but this is the natural, additive shape:
// same enum, same field name as the read model, mirrored from
// DecideVerificationRequestDto's own "small, targeted transition body"
// precedent.
export class UpdateJourneyStageRequestDto {
  @IsEnum(JourneyStage)
  stage!: JourneyStage;
}

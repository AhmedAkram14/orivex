import type { JourneyStage } from '../../../domain/enums/journey-stage.enum.js';

export interface UpdateJourneyStageCommandProps {
  healthJourneyId: string;
  nextStage: JourneyStage;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style).
export class UpdateJourneyStageCommand {
  readonly healthJourneyId: string;
  readonly nextStage: JourneyStage;

  constructor(props: UpdateJourneyStageCommandProps) {
    this.healthJourneyId = props.healthJourneyId;
    this.nextStage = props.nextStage;
  }
}

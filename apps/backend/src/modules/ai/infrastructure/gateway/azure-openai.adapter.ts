import { Injectable } from '@nestjs/common';
import type { OpenAI } from 'openai';

import { AISuggestionType } from '../../domain/enums/ai-suggestion-type.enum.js';
import { AIDomainError } from '../../domain/exceptions/ai-domain.error.js';
import type { AIProviderPort, GenerateSuggestionRequest, GenerateSuggestionResult } from '../../application/ports/ai-provider.port.js';

// Deliberately the plain `OpenAI` client, not the SDK's `AzureOpenAI`
// subclass -- this resource's model deployment only resolves through
// Azure's newer unified v1 endpoint (`.../openai/v1`, confirmed by trial
// against the actual provisioned resource), which is OpenAI-API-compatible
// by design and takes a plain `baseURL` + `apiKey`, not `AzureOpenAI`'s
// classic `endpoint`/`apiVersion`/`deployments/{name}` path shape.
//
// The exact slice of the client this adapter actually calls -- narrowed
// down from the full `OpenAI` client so a hand-written fake can implement
// it in tests (this codebase's established convention: no mocking
// library, a real object implementing the real shape), matching
// StripePaymentGatewayAdapter's own `StripeClient` precedent.
export type AzureOpenAIClient = Pick<OpenAI, 'chat'>;

// Server-authored instructions per suggestion type (docs/12-openapi.md's
// requestAISuggestion suggestionType enum) -- the model only ever sees
// clinical context the caller already scoped server-side
// (RequestAISuggestionUseCase's own GetHealthGraphSubgraphUseCase read),
// never a free-text prompt a doctor could redirect. Every instruction below
// ends the same way, deliberately: a draft for the treating doctor's own
// review, never a final clinical record entry -- CLAUDE.md's "AI never
// writes directly to clinical records" is enforced by the domain layer
// (AISuggestion is never itself a ClinicalNote/Prescription; only
// RecordDoctorDecisionUseCase, called by the doctor, can act on one), not
// by this prompt -- but the prompt still says so, so the model doesn't
// phrase its own output as if it already were one.
const SYSTEM_INSTRUCTIONS: Record<AISuggestionType, string> = {
  [AISuggestionType.SoapDraft]:
    'You are a clinical documentation assistant. Draft a SOAP-structured (Subjective, Objective, Assessment, Plan) note from the given patient context. This is a draft for the treating doctor to review and edit -- never a final clinical record entry.',
  [AISuggestionType.PrescriptionDraft]:
    'You are a clinical documentation assistant. Draft a proposed medication (name, dosage, frequency, duration, instructions) from the given patient context. This is a draft for the treating doctor to review and approve -- never a final prescription.',
  [AISuggestionType.InteractionFlag]:
    'You are a clinical safety assistant. Review the given patient context for potential drug interactions or contraindications and flag any you find, with a brief explanation each. If none are apparent from the given context, say so plainly. This is advisory only, for the treating doctor to verify.',
  [AISuggestionType.SuggestedQuestion]:
    'You are a clinical documentation assistant. Suggest 3-5 relevant follow-up questions the treating doctor could ask given the patient context, to help clarify the clinical picture.',
  [AISuggestionType.Summary]:
    'You are a clinical documentation assistant. Summarize the given patient context concisely for the treating doctor, highlighting the clinically relevant history.',
  [AISuggestionType.FollowUpPlan]:
    'You are a clinical documentation assistant. Draft a proposed follow-up plan (recommended timeframe and reason) from the given patient context. This is a draft for the treating doctor to review and approve.',
};

// Real Azure OpenAI adapter (ORIVEX Roadmap 2.0, AIModule). Bound in
// ai.module.ts only when AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_API_KEY/
// AZURE_OPENAI_DEPLOYMENT_NAME are all set -- mirrors
// StripePaymentGatewayAdapter's own conditional-factory precedent exactly.
//
// Takes an already-constructed client rather than raw credentials -- keeps
// this adapter's own dependency injectable/testable, with ai.module.ts
// owning the one real `new AzureOpenAI(...)` call.
@Injectable()
export class AzureOpenAIAdapter implements AIProviderPort {
  constructor(
    private readonly client: AzureOpenAIClient,
    private readonly deploymentName: string,
  ) {}

  async generateSuggestion(request: GenerateSuggestionRequest): Promise<GenerateSuggestionResult> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.deploymentName,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTIONS[request.suggestionType] },
          { role: 'user', content: JSON.stringify(request.context) },
        ],
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new AIDomainError('Azure OpenAI returned an empty completion.');
      }

      return {
        content,
        // Every AI suggestion requires the treating doctor's explicit
        // acknowledgment before RecordDoctorDecisionUseCase can act on it
        // -- CLAUDE.md's "AI never writes directly to clinical records" --
        // never conditionally waived by this adapter.
        requiresAcknowledgment: true,
        safetyFlags: [],
      };
    } catch (error) {
      if (error instanceof AIDomainError) {
        throw error;
      }
      throw new AIDomainError(
        `Azure OpenAI request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

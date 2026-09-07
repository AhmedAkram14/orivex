import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type OpenAI from 'openai';

import { AISuggestionType } from '../../domain/enums/ai-suggestion-type.enum.js';
import { AIDomainError } from '../../domain/exceptions/ai-domain.error.js';

import { AzureOpenAIAdapter, type AzureOpenAIClient } from './azure-openai.adapter.js';

// Hand-written fake matching this codebase's no-mocking-library convention
// (StripePaymentGatewayAdapter's own FakeStripeClient precedent) --
// implements only the narrow `AzureOpenAIClient` slice the adapter
// actually calls.
class FakeAzureOpenAIClient implements AzureOpenAIClient {
  public lastCreateParams: OpenAI.Chat.Completions.ChatCompletionCreateParams | undefined;

  constructor(private readonly result: { content: string | null } | Error) {}

  chat = {
    completions: {
      create: async (params: OpenAI.Chat.Completions.ChatCompletionCreateParams) => {
        this.lastCreateParams = params;
        if (this.result instanceof Error) {
          throw this.result;
        }
        return { choices: [{ message: { content: this.result.content } }] } as unknown as OpenAI.Chat.Completions.ChatCompletion;
      },
    },
  } as unknown as AzureOpenAIClient['chat'];
}

const baseRequest = {
  suggestionType: AISuggestionType.SoapDraft,
  consultationSessionId: 'session-1',
  context: { patientId: 'patient-1', healthGraphNodes: [] },
};

describe('AzureOpenAIAdapter.generateSuggestion', () => {
  it('returns the completion content with requiresAcknowledgment always true -- AI never writes directly to clinical records', async () => {
    const client = new FakeAzureOpenAIClient({ content: 'Draft SOAP note.' });
    const adapter = new AzureOpenAIAdapter(client, 'gpt-4.1-mini');

    const result = await adapter.generateSuggestion(baseRequest);

    assert.deepEqual(result, {
      content: 'Draft SOAP note.',
      requiresAcknowledgment: true,
      safetyFlags: [],
    });
  });

  it('calls the deployment name as the model parameter (Azure OpenAI convention: model = deployment name)', async () => {
    const client = new FakeAzureOpenAIClient({ content: 'Draft.' });
    const adapter = new AzureOpenAIAdapter(client, 'my-deployment');

    await adapter.generateSuggestion(baseRequest);

    assert.equal(client.lastCreateParams?.model, 'my-deployment');
  });

  it('sends only server-determined context as the user message, never a free-text prompt', async () => {
    const client = new FakeAzureOpenAIClient({ content: 'Draft.' });
    const adapter = new AzureOpenAIAdapter(client, 'gpt-4.1-mini');

    await adapter.generateSuggestion(baseRequest);

    const userMessage = client.lastCreateParams?.messages.find((m) => m.role === 'user');
    assert.equal(userMessage?.content, JSON.stringify(baseRequest.context));
  });

  it('throws AIDomainError when the completion has no content', async () => {
    const client = new FakeAzureOpenAIClient({ content: null });
    const adapter = new AzureOpenAIAdapter(client, 'gpt-4.1-mini');

    await assert.rejects(() => adapter.generateSuggestion(baseRequest), AIDomainError);
  });

  it('wraps a provider failure in AIDomainError -- RequestAISuggestionUseCase treats this as the documented AI-unavailable degraded mode', async () => {
    const client = new FakeAzureOpenAIClient(new Error('rate limited'));
    const adapter = new AzureOpenAIAdapter(client, 'gpt-4.1-mini');

    await assert.rejects(() => adapter.generateSuggestion(baseRequest), (error: unknown) => {
      assert.ok(error instanceof AIDomainError);
      assert.match(error.message, /rate limited/);
      return true;
    });
  });
});

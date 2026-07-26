import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { VerificationDocumentViewer } from './verification-document-viewer';
import { server } from '@/mocks/server';
import { env } from '@/shared/lib/env';
import enMessages from '../../../../messages/en.json';

const base = () => env.apiBaseUrl;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderViewer(mediaAssetId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <VerificationDocumentViewer mediaAssetId={mediaAssetId} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('VerificationDocumentViewer', () => {
  it('renders an inline image preview for an image document, via a real signed URL', async () => {
    renderViewer('seed-national-id-front');

    const image = await screen.findByRole('img', { name: 'National ID (front)' });
    expect(image).toHaveAttribute('src', expect.stringContaining('/mock-object-storage/seed-national-id-front'));
    // Never a raw/unsigned reference to the private object key alone.
    expect(image.getAttribute('src')).not.toBe('seed-national-id-front');
  });

  it('renders an "Open document" link (not an inline preview) for a non-image document', async () => {
    server.use(
      http.post(`${base()}/media-assets/upload-intent`, () =>
        HttpResponse.json(
          { data: { id: 'asset-pdf-1', purpose: 'medical_license', contentType: 'application/pdf', status: 'pending', signedUrl: `${base()}/mock-object-storage/asset-pdf-1` } },
          { status: 201 },
        ),
      ),
      http.get(`${base()}/media-assets/:id`, ({ params }) =>
        HttpResponse.json({
          data: {
            id: params.id,
            purpose: 'medical_license',
            contentType: 'application/pdf',
            status: 'confirmed',
            signedUrl: `${base()}/mock-object-storage/${params.id as string}`,
          },
        }),
      ),
    );

    renderViewer('asset-pdf-1');

    expect(await screen.findByRole('link', { name: 'Open document' })).toHaveAttribute(
      'href',
      expect.stringContaining('/mock-object-storage/asset-pdf-1'),
    );
    expect(screen.getByText('Medical license')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows a load error when the document cannot be found (e.g. not owned by the caller and caller is not admin)', async () => {
    renderViewer('does-not-exist');

    expect(await screen.findByText('Could not load this document.')).toBeInTheDocument();
  });
});

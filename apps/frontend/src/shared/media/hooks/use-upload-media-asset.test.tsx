import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mediaApi } from '@/shared/media/media-api';
import type { MediaAsset } from '@/shared/media/types';

import { useUploadMediaAsset } from './use-upload-media-asset';

vi.mock('@/shared/media/media-api', () => ({
  mediaApi: { createUploadIntent: vi.fn(), confirmUpload: vi.fn() },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useUploadMediaAsset', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('runs the full upload-intent -> PUT -> confirm flow and returns the confirmed asset', async () => {
    const intent: MediaAsset = {
      id: 'asset-1',
      purpose: 'doctor_certificate',
      contentType: 'application/pdf',
      status: 'pending',
      signedUrl: 'https://storage.example.com/asset-1',
    };
    const confirmed: MediaAsset = { ...intent, status: 'confirmed' };
    vi.mocked(mediaApi.createUploadIntent).mockResolvedValue(intent);
    vi.mocked(mediaApi.confirmUpload).mockResolvedValue(confirmed);
    const putSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', putSpy);

    const file = new File(['content'], 'license.pdf', { type: 'application/pdf' });
    const { result } = renderHook(() => useUploadMediaAsset(), { wrapper: createWrapper() });

    result.current.mutate({ file, purpose: 'doctor_certificate' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mediaApi.createUploadIntent).toHaveBeenCalledWith({
      contentType: 'application/pdf',
      purpose: 'doctor_certificate',
      sizeEstimate: file.size,
    });
    expect(putSpy).toHaveBeenCalledWith('https://storage.example.com/asset-1', expect.objectContaining({ method: 'PUT' }));
    expect(mediaApi.confirmUpload).toHaveBeenCalledWith('asset-1');
    expect(result.current.data).toEqual(confirmed);
  });

  it('fails when the storage PUT itself fails', async () => {
    const intent: MediaAsset = {
      id: 'asset-2',
      purpose: 'doctor_certificate',
      contentType: 'application/pdf',
      status: 'pending',
      signedUrl: 'https://storage.example.com/asset-2',
    };
    vi.mocked(mediaApi.createUploadIntent).mockResolvedValue(intent);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const file = new File(['content'], 'license.pdf', { type: 'application/pdf' });
    const { result } = renderHook(() => useUploadMediaAsset(), { wrapper: createWrapper() });

    result.current.mutate({ file, purpose: 'doctor_certificate' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mediaApi.confirmUpload).not.toHaveBeenCalled();
  });
});

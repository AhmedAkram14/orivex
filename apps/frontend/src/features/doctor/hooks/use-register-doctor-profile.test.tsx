import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorProfileKeys } from '@/features/doctor/hooks/query-keys';
import type { DoctorProfile } from '@/features/doctor/api/types';

import { useRegisterDoctorProfile } from './use-register-doctor-profile';

vi.mock('@/features/doctor/api/doctor-api', () => ({
  doctorApi: { registerProfile: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useRegisterDoctorProfile', () => {
  it('seeds the doctor-profile cache with the newly created profile', async () => {
    const profile = { id: 'doctor-profile-1', licenseNumber: 'LIC-1', specialty: 'Cardiology' } as DoctorProfile;
    vi.mocked(doctorApi.registerProfile).mockResolvedValue(profile);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useRegisterDoctorProfile(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ licenseNumber: 'LIC-1', specialty: 'Cardiology' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(doctorProfileKeys.detail('current'))).toEqual(profile);
  });
});

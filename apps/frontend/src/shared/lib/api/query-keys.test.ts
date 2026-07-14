import { describe, expect, it } from 'vitest';
import { createQueryKeyFactory } from './query-keys';

describe('createQueryKeyFactory', () => {
  const doctorKeys = createQueryKeyFactory('doctors');

  it('produces a hierarchical key structure that supports broad or narrow invalidation', () => {
    expect(doctorKeys.all).toEqual(['doctors']);
    expect(doctorKeys.lists()).toEqual(['doctors', 'list']);
    expect(doctorKeys.list({ page: 1 })).toEqual(['doctors', 'list', { page: 1 }]);
    expect(doctorKeys.details()).toEqual(['doctors', 'detail']);
    expect(doctorKeys.detail('abc-123')).toEqual(['doctors', 'detail', 'abc-123']);
  });
});

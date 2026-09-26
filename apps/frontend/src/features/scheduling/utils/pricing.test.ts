import { describe, expect, it } from 'vitest';
import { formatConsultationPrice } from './pricing';

const format = { number: (value: number) => String(value) } as never;
const freeSlot = { consultationType: 'free', feeAmount: null, feeCurrency: null } as const;
const normally = { amount: 320, currency: 'EGP', label: (price: string) => `normally ${price}` };

describe('formatConsultationPrice', () => {
  it('says only "Free" when no normal fee is known', () => {
    expect(formatConsultationPrice(freeSlot, format, 'Free')).toBe('Free');
    expect(formatConsultationPrice(freeSlot, format, 'Free', { ...normally, amount: undefined })).toBe('Free');
    expect(formatConsultationPrice(freeSlot, format, 'Free', { ...normally, amount: 0 })).toBe('Free');
  });

  it('appends the normal fee to a free slot when the doctor normally charges', () => {
    expect(formatConsultationPrice(freeSlot, format, 'Free', normally)).toContain('Free · normally ');
  });
});

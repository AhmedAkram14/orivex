'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Heading, Text } from '@/design-system/typography';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';

/** Same rounding as the earnings ledger (GetDoctorEarningsSummaryUseCase): commission to the piastre, net is the rest. */
function split(fee: number, commissionRate: number) {
  const platformFee = Math.round(fee * commissionRate * 100) / 100;
  return { platformFee, net: Math.round((fee - platformFee) * 100) / 100 };
}

export interface FeeCalculatorProps {
  /** From `GET /public/platform-fees` -- the rate the earnings ledger really applies. */
  commissionRate: number;
  /** Starting fee: the median real consultation fee on the platform, when there is one. */
  initialFee?: number;
}

/** Fee -> platform fee -> net, live as the doctor types their own fee. */
export function FeeCalculator({ commissionRate, initialFee }: FeeCalculatorProps) {
  const t = useTranslations('publicSite.forDoctorsPage.fees');
  const format = useFormatter();
  const inputId = useId();
  const hintId = useId();
  const [raw, setRaw] = useState(initialFee !== undefined ? String(initialFee) : '');

  const fee = Math.max(0, Number(raw) || 0);
  const { platformFee, net } = split(fee, commissionRate);
  const rate = format.number(commissionRate, { style: 'percent', maximumFractionDigits: 1 });
  const money = (amount: number) => formatCurrency(format, amount, 'EGP');

  return (
    <Card className="flex flex-col gap-5 p-6">
      <Heading as="h3" level={4}>
        {t('calculatorTitle')}
      </Heading>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-small font-medium text-text-primary">
          {t('feeInputLabel')}
        </label>
        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={0}
          step={10}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          aria-describedby={initialFee !== undefined ? hintId : undefined}
          className="h-12 text-base"
        />
        {initialFee !== undefined && (
          <Text size="sm" tone="tertiary" as="p">
            <span id={hintId}>{t('feeInputHint')}</span>
          </Text>
        )}
      </div>

      <dl aria-live="polite" className="flex flex-col divide-y divide-border-default rounded-md border border-border-default">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-small text-text-secondary">{t('consultationFee')}</dt>
          <dd data-numeric className="font-semibold text-text-primary">{money(fee)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-small text-text-secondary">{t('platformFee', { rate })}</dt>
          <dd data-numeric className="font-semibold text-text-secondary">− {money(platformFee)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 bg-success-subtle px-4 py-3">
          <dt className="text-small font-semibold text-success-emphasis">{t('youReceive')}</dt>
          <dd data-numeric className="text-h3 text-success-emphasis">{money(net)}</dd>
        </div>
      </dl>
    </Card>
  );
}

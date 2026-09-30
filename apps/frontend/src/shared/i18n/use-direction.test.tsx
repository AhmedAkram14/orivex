import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Select, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';

function renderIn(locale: 'en' | 'ar') {
  return render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <Tabs defaultValue="a" data-testid="tabs">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>
      <RadioGroup data-testid="radios" aria-label="r">
        <RadioGroupItem value="x" aria-label="x" />
      </RadioGroup>
      <Select>
        <SelectTrigger aria-label="pick">
          <SelectValue />
        </SelectTrigger>
      </Select>
    </NextIntlClientProvider>,
  );
}

describe('shared Radix wrappers follow the locale direction', () => {
  it('lay out right-to-left in Arabic (Radix alone would stamp dir="ltr")', () => {
    renderIn('ar');
    expect(screen.getByTestId('tabs')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('radios')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('combobox', { name: 'pick' })).toHaveAttribute('dir', 'rtl');
  });

  it('stay left-to-right in English', () => {
    renderIn('en');
    expect(screen.getByTestId('tabs')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('radios')).toHaveAttribute('dir', 'ltr');
  });
});

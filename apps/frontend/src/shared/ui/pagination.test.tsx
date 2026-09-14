import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import enMessages from '../../../messages/en.json';
import { Pagination } from './pagination';

// K6 -- AR/EN localization fix (ORIVEX Remaining Work Audit): Pagination
// now reads real translated strings via useTranslations, so every render
// needs a NextIntlClientProvider ancestor -- including on rerender, since
// rerender replaces the whole tree passed to it, not just the leaf.
function withIntl(ui: ReactElement) {
  return <NextIntlClientProvider locale="en" messages={enMessages}>{ui}</NextIntlClientProvider>;
}

describe('Pagination', () => {
  it('disables Previous on the first page and Next on the last page', () => {
    const { rerender } = render(withIntl(<Pagination page={1} pageCount={3} onPageChange={vi.fn()} />));
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();

    rerender(withIntl(<Pagination page={3} pageCount={3} onPageChange={vi.fn()} />));
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('calls onPageChange with the adjacent page number', async () => {
    const onPageChange = vi.fn();
    render(withIntl(<Pagination page={2} pageCount={5} onPageChange={onPageChange} />));

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import enMessages from '../../../messages/en.json';
import { pageItems, Pagination } from './pagination';

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

  it('jumps straight to a numbered page and marks the current one', async () => {
    const onPageChange = vi.fn();
    render(withIntl(<Pagination page={2} pageCount={5} onPageChange={onPageChange} />));

    expect(screen.getByRole('button', { name: 'Go to page 2' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Go to page 5' }));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });
});

describe('pageItems', () => {
  it('lists every page when there are seven or fewer', () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps the first, last and neighbouring pages, with a gap where pages are skipped', () => {
    expect(pageItems(1, 12)).toEqual([1, 2, 3, 4, 'ellipsis', 12]);
    expect(pageItems(6, 12)).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 12]);
    expect(pageItems(12, 12)).toEqual([1, 'ellipsis', 9, 10, 11, 12]);
  });
});

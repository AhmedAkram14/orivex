import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { AppBreadcrumbs } from '@/features/shell/components/breadcrumbs';
import enMessages from '../../../../messages/en.json';

let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => mockPathname,
  useParams: () => ({ locale: 'en' }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  RedirectType: { push: 'push', replace: 'replace' },
}));

function renderBreadcrumbs() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AppBreadcrumbs />
    </NextIntlClientProvider>,
  );
}

describe('AppBreadcrumbs', () => {
  it('renders nothing for a one-level route (a single crumb has no navigational value)', () => {
    mockPathname = '/dashboard';
    const { container } = renderBreadcrumbs();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a route the nav config does not know about', () => {
    mockPathname = '/some/unmapped/route';
    const { container } = renderBreadcrumbs();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a trail for a nested route; a group ancestor has no page of its own, so it is not a link either', () => {
    // /billing is nested under the Administration group in the nav config.
    // Administration is a group node (no href) -- there is nowhere for it
    // to link to -- so both crumbs render as non-clickable text, unlike a
    // leaf-ancestor trail (not reachable in the current nav config's depth).
    mockPathname = '/billing';
    renderBreadcrumbs();

    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

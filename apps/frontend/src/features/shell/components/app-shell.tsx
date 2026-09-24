'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { CommandPalette } from '@/features/shell/components/command-palette';
import { HelpCenterCard } from '@/features/shell/components/help-center-card';
import { MobileNav } from '@/features/shell/components/mobile-nav';
import { NotificationBell } from '@/features/shell/components/notification-bell';
import { SidebarNav } from '@/features/shell/components/sidebar-nav';
import { UserMenu } from '@/features/shell/components/user-menu';
import { useDoctorProfile } from '@/features/doctor/hooks/use-doctor-profile';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import { useAuth } from '@/shared/auth/auth-context';
import { Link } from '@/shared/i18n/navigation';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { useRealtimeSocket } from '@/shared/lib/realtime/use-realtime-socket';
import { Content } from '@/shared/ui/layout/content';
import { Logo } from '@/shared/ui/logo';
import { Sidebar } from '@/shared/ui/layout/sidebar';
import { Topbar } from '@/shared/ui/layout/topbar';

/**
 * The Root Dashboard Layout — every route under `(protected)` renders
 * inside this. Composes the structural primitives from `shared/ui/layout`
 * (Topbar/Sidebar/Content/Footer, which know nothing about auth or nav
 * content) with this feature's session-aware pieces (`SidebarNav`,
 * `UserMenu`, `MobileNav`). Assumes an authenticated session — it is only
 * ever rendered inside `RequireAuth` (`app/[locale]/(protected)/layout.tsx`),
 * never standalone.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('shell');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  useRealtimeSocket();

  const { user } = useAuth();
  const isDoctor = user?.roles.includes('doctor') ?? false;
  const { data: doctorProfile } = useDoctorProfile({ enabled: isDoctor });
  const { data: specialties } = useSpecialtiesList();
  const matchedSpecialty = doctorProfile
    ? specialties?.find((specialty) => specialty.id === doctorProfile.specialtyId)
    : undefined;
  // Phase 8 AR localization fix: this topbar/menu subtitle was reading
  // `.name` (the canonical English string) unconditionally, unlike the
  // Doctor Directory and Doctor Profile pages, which already resolve a
  // specialty's Arabic name via `pickLocalizedName` when `nameAr` exists
  // and the locale is Arabic. A doctor viewing their own workspace in
  // Arabic saw their own specialty in English everywhere this component
  // renders it (topbar trigger + dropdown label) -- same real `nameAr`
  // field, just not applied here. No backend change: `nameAr` was already
  // present on `MedicalSpecialtyResponseDto`/`MedicalSpecialty`, this was a
  // frontend gap only.
  const specialtyName = matchedSpecialty ? pickLocalizedName(matchedSpecialty.name, matchedSpecialty.nameAr, locale) : undefined;

  return (
    <div className="flex h-screen flex-col">
      {/* Phase 8: "Skip to main content" -- the very first focusable element
          in the shell, before the topbar's own logo/nav triggers. Invisible
          until it receives keyboard focus (`sr-only focus:not-sr-only`,
          same reveal-on-focus pattern as this codebase's other
          focus-visible affordances), then jumps straight to Content's
          `<main id="main-content">`, skipping the topbar + full sidebar nav
          -- previously a keyboard/screen-reader user had no way to bypass
          that on every single page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:inset-s-2 focus:top-2 focus:z-(--z-tooltip) focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-text-primary focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        {tCommon('skipToMainContent')}
      </a>
      <Topbar>
        <MobileNav />
        {/* UX Reliability Pass: the logo now always goes to the public landing page, matching the established convention that a site's own logo is a "home" link to the marketing site, not the app's own /dashboard fallback route (which is no longer nav-reachable at all -- see navigation.ts). Consistent across patient/doctor/admin, desktop/mobile (MobileNav's own logo is a non-interactive drawer title, not a second link), and both locales via this same i18n-aware Link. */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-semibold text-text-primary"
        >
          <Logo size="sm" />
          {/* Responsive pass (Phase 7): below `sm` (640px) the topbar is a fixed
              h-14 bar shared with the mobile nav trigger, command palette and
              notification bell -- the full wordmark ("Orivex") plus the doctor's
              name/specialty in UserMenu's `showName` block was the exact
              combination that truncated the wordmark to "Orive" and forced the
              name to wrap onto 2-3 lines, clipping against the bar's fixed
              height. Hiding the wordmark text below `sm` keeps the logo mark
              (still a real, focusable "home" link) without the word that has
              nowhere to grow; name/specialty move into UserMenu's dropdown
              instead (see user-menu.tsx). Unaffected at `sm` and above. */}
          <span className="hidden sm:inline">{tCommon('appName')}</span>
        </Link>
        <div className="ms-auto flex items-center gap-2">
          <CommandPalette />
          <NotificationBell />
          <UserMenu showName subtitle={specialtyName} />
        </div>
      </Topbar>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="hidden lg:flex">
          {/* Security Center audit: on a role with enough nav items (e.g.
              Admin's two groups), the last item -- often "Settings"/
              "Security" -- sat exactly at this region's bottom edge and
              rendered visibly cut in half, with nothing to signal "this
              scrolls, there's more below." A `scrollbar-color`/webkit-track
              customization here (this div's previous approach) only styles
              a scrollbar that Chromium's overlay-scrollbar behavior still
              hides until actively scrolling/hovering, so it never actually
              fixed the "looks broken" problem. A bottom fade mask is
              hover-independent and unambiguous: content visibly fades out
              near the edge instead of hard-clipping mid-glyph, and it's a
              harmless no-op on a role with few enough items that nothing
              actually overflows. */}
          <div className="relative min-h-0 flex-1">
            <div className="h-full overflow-y-auto [mask-image:linear-gradient(to_bottom,black_calc(100%-28px),transparent)]">
              <SidebarNav />
              {/* Real spacer, not just the mask's fade -- guarantees the
                  last item's full height is scrollable past the fade zone
                  rather than the fade eating into its final pixels. */}
              <div className="h-7" aria-hidden="true" />
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-border-default pt-3">
            <HelpCenterCard />
            <p className="px-2 text-xs text-text-tertiary">{t('footer', { year: new Date().getFullYear() })}</p>
          </div>
        </Sidebar>
        <Content>{children}</Content>
      </div>
    </div>
  );
}

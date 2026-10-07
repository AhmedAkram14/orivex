import { LandingFooter } from '@/features/landing/components/landing-footer';
import { LandingNavbar } from '@/features/landing/components/landing-navbar';
import { BackToTopButton } from '@/shared/ui/back-to-top-button';

/**
 * The public marketing site's chrome: one navbar and footer shared by the
 * homepage and every public page (specialties, find a doctor, help...), so
 * navigating between them never remounts the header.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingNavbar />
      {children}
      <LandingFooter />
      <BackToTopButton />
    </>
  );
}

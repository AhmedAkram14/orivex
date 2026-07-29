import { useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui/accordion';
import { Container } from '@/shared/ui/container';

// Grounded only in real product behavior confirmed in the audit backing
// this page: booking requires doctor approval (both Free and Paid),
// becoming a doctor goes through real identity/professional verification,
// video consultations are the real LiveKit-backed core call (no
// recording/AI summary claimed), prescriptions are sign/view/print only
// (no pharmacy transmission claimed).
export const FAQ_KEYS = ['booking', 'becomeDoctor', 'verification', 'consultations', 'prescriptions'] as const;

export function FaqSection() {
  const t = useTranslations('landing.faq');

  return (
    <Container size="md" className="flex flex-col gap-8 py-16">
      <Heading level={1} className="text-center">
        {t('title')}
      </Heading>
      <Accordion type="single" collapsible>
        {FAQ_KEYS.map((key) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger>{t(`items.${key}.question`)}</AccordionTrigger>
            <AccordionContent>{t(`items.${key}.answer`)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Container>
  );
}

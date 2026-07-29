import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { Container } from '@/shared/ui/container';

const PATIENT_STEP_KEYS = ['findDoctor', 'bookAppointment', 'identityVerification', 'videoConsultation', 'medicalRecords'] as const;
const DOCTOR_STEP_KEYS = ['register', 'verification', 'manageSchedule', 'meetPatients', 'consult', 'managePractice'] as const;

function StepList({ titleKey, stepKeys }: { titleKey: string; stepKeys: readonly string[] }) {
  const t = useTranslations('landing.howItWorks');

  return (
    <Card className="flex flex-col gap-4 p-6">
      <Heading level={3}>{t(titleKey)}</Heading>
      <ol className="flex flex-col gap-3">
        {stepKeys.map((key, index) => (
          <li key={key} className="flex items-start gap-3">
            <Badge variant="primary" className="mt-0.5 shrink-0">
              {index + 1}
            </Badge>
            <Text size="sm">{t(`steps.${key}`)}</Text>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/**
 * The two real journeys the product actually supports today, in order:
 * Patient (find → book → verify identity → video consultation → records)
 * and Doctor (register → verification → schedule → meet patients →
 * consult → manage practice). Every step names a feature confirmed real in
 * the audit backing this page; nothing here is aspirational.
 */
export function HowItWorksSection() {
  const t = useTranslations('landing.howItWorks');

  return (
    <Container id="how-it-works" size="lg" className="flex flex-col gap-8 py-16 scroll-mt-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StepList titleKey="patientTitle" stepKeys={PATIENT_STEP_KEYS} />
        <StepList titleKey="doctorTitle" stepKeys={DOCTOR_STEP_KEYS} />
      </div>
    </Container>
  );
}

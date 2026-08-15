import {
  CalendarDays,
  CalendarCheck,
  ClipboardList,
  Clock,
  FileText,
  HeartPulse,
  IdCard,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  UserPlus,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Heading, Text } from '@/design-system/typography';
import { Badge } from '@/shared/ui/badge';
import { Container } from '@/shared/ui/container';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

interface StepDefinition {
  key: string;
  icon: LucideIcon;
}

const PATIENT_STEPS: StepDefinition[] = [
  { key: 'findDoctor', icon: Search },
  { key: 'bookAppointment', icon: CalendarDays },
  { key: 'identityVerification', icon: ShieldCheck },
  { key: 'videoConsultation', icon: Video },
  { key: 'medicalRecords', icon: FileText },
];

const DOCTOR_STEPS: StepDefinition[] = [
  { key: 'register', icon: UserPlus },
  { key: 'verification', icon: IdCard },
  { key: 'manageSchedule', icon: Clock },
  { key: 'meetPatients', icon: ClipboardList },
  { key: 'consult', icon: Video },
  { key: 'managePractice', icon: CalendarCheck },
];

const PANEL_THEME = {
  primary: {
    panelBg: 'bg-primary-subtle/40',
    title: 'text-primary',
    circle: 'border-primary text-primary',
    iconBg: 'bg-primary-subtle text-primary',
  },
  success: {
    panelBg: 'bg-success-subtle/40',
    title: 'text-success',
    circle: 'border-success text-success',
    iconBg: 'bg-success-subtle text-success',
  },
} as const;

function StepPanel({
  headerIcon,
  titleKey,
  descriptionKey,
  steps,
  theme,
}: {
  headerIcon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  steps: StepDefinition[];
  theme: keyof typeof PANEL_THEME;
}) {
  const t = useTranslations('landing.howItWorks');
  const palette = PANEL_THEME[theme];

  return (
    <div className={cn('flex flex-col rounded-2xl border border-border-default p-6', palette.panelBg)}>
      <div className="flex items-center gap-4 pb-6">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface shadow-sm">
          <Icon icon={headerIcon} size="lg" className={palette.title} />
        </span>
        <div className="flex flex-col gap-0.5">
          <Heading level={3} className={palette.title}>
            {t(titleKey)}
          </Heading>
          <Text size="sm" tone="secondary">
            {t(descriptionKey)}
          </Text>
        </div>
      </div>

      <span className="-mx-6 h-px bg-border-default" aria-hidden="true" />

      <ol className="flex flex-col pt-4">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-surface text-sm font-bold',
                    palette.circle,
                  )}
                >
                  {index + 1}
                </span>
                {!isLast && (
                  <span className="mt-1 w-px flex-1 border-s border-dashed border-border-strong" aria-hidden="true" />
                )}
              </div>
              <div className={cn('flex flex-1 items-start gap-3', isLast ? 'pb-0' : 'pb-5')}>
                <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', palette.iconBg)}>
                  <Icon icon={step.icon} size="md" />
                </span>
                <div className="flex flex-col gap-0.5 pt-1">
                  <Text size="base" className="font-bold">
                    {t(`steps.${step.key}.title`)}
                  </Text>
                  <Text size="sm" tone="secondary">
                    {t(`steps.${step.key}.description`)}
                  </Text>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
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
        <Badge variant="primary" className="gap-1.5 px-3 py-1 text-xs uppercase tracking-wide">
          <Icon icon={ShieldCheck} size="xs" />
          {t('eyebrow')}
        </Badge>
        <Heading level={1}>{t('title')}</Heading>
        <Text tone="secondary" className="max-w-xl">
          {t('description')}
        </Text>
        <div className="flex items-center gap-3 pt-1" aria-hidden="true">
          <span className="h-px w-10 bg-primary/40" />
          <Icon icon={HeartPulse} size="sm" className="text-primary" />
          <span className="h-px w-10 bg-primary/40" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StepPanel
          headerIcon={User}
          titleKey="patientTitle"
          descriptionKey="patientDescription"
          steps={PATIENT_STEPS}
          theme="primary"
        />
        <StepPanel
          headerIcon={Stethoscope}
          titleKey="doctorTitle"
          descriptionKey="doctorDescription"
          steps={DOCTOR_STEPS}
          theme="success"
        />
      </div>
    </Container>
  );
}

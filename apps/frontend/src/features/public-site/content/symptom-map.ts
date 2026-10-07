import { Activity, Baby, Brain, Ear, Eye, HeartPulse, Smile, Sparkles, Stethoscope, type LucideIcon } from 'lucide-react';
import type { SpecialtyContentKey } from '@/features/public-site/lib/specialty-content';

/**
 * "Not sure who to see?" -- common complaints mapped to the specialty a
 * patient would usually start with. Orientation only, never triage: the
 * guide renders a not-medical-advice disclaimer, and an entry whose
 * specialty has no real record in the DB is simply not shown (no dead link).
 * Labels live in `publicSite.specialtiesPage.symptoms.items.<key>`.
 */
export const SYMPTOM_GUIDE: readonly { key: string; specialty: SpecialtyContentKey; icon: LucideIcon }[] = [
  { key: 'chestPain', specialty: 'cardiology', icon: HeartPulse },
  { key: 'skinRash', specialty: 'dermatology', icon: Sparkles },
  { key: 'anxiety', specialty: 'psychiatry', icon: Brain },
  { key: 'childFever', specialty: 'pediatrics', icon: Baby },
  { key: 'toothache', specialty: 'dentistry', icon: Smile },
  { key: 'jointPain', specialty: 'orthopedics', icon: Activity },
  { key: 'blurredVision', specialty: 'ophthalmology', icon: Eye },
  { key: 'soreThroat', specialty: 'ent', icon: Ear },
  { key: 'fatigue', specialty: 'internalMedicine', icon: Stethoscope },
];

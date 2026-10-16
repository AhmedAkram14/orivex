/**
 * Demo timeline -- who sees whom, for what, and when.
 *
 * One hand-written care story per demo patient: each episode is a doctor, a
 * condition from that doctor's own specialty (see clinical.ts), how many days
 * before the anchor it started, and the visit cadence. The planner turns these
 * into dated appointments on the doctor's real slot grid; a deterministic
 * top-up then lifts any doctor still below the minimum completed-visit floor
 * with short episodes drawn from the doctor's own specialty focus.
 */

/** "pediatric" = a parent-guidance consultation (see PEDIATRIC_TOPICS). */
export type EpisodeCondition = string;

export interface Episode {
  doctor: string; // 'doctor03'
  condition: EpisodeCondition;
  startDaysAgo: number;
  visits: number;
  cadenceDays: number;
}

export interface PinnedVisit {
  doctor: string;
  condition: EpisodeCondition;
  /** 0 = the anchor's own Cairo day. */
  dayOffset: number;
  slot: 'earlierToday' | 'soonAfterAnchor' | 'laterToday' | 'any';
  outcome: 'completed' | 'confirmed' | 'pendingApproval' | 'awaitingPayment' | 'rescheduledThenConfirmed';
  /** For rescheduledThenConfirmed: the original day the visit was booked for. */
  originalDayOffset?: number;
}

export interface PatientStory {
  patient: string; // 'patient03'
  episodes: Episode[];
  pinned?: PinnedVisit[];
  /** No activity after this many days before the anchor (identity suspension). */
  inactiveAfterDaysAgo?: number;
}

export const PATIENT_STORIES: PatientStory[] = [
  {
    patient: 'patient01',
    episodes: [
      { doctor: 'doctor03', condition: 'burnout', startDaysAgo: 265, visits: 2, cadenceDays: 21 },
      { doctor: 'doctor01', condition: 'depression_recurrent', startDaysAgo: 240, visits: 9, cadenceDays: 28 },
      { doctor: 'doctor15', condition: 'pediatric', startDaysAgo: 180, visits: 2, cadenceDays: 60 },
      { doctor: 'doctor17', condition: 'low_back_pain', startDaysAgo: 120, visits: 2, cadenceDays: 18 },
      { doctor: 'doctor18', condition: 'dental_checkup', startDaysAgo: 60, visits: 2, cadenceDays: 21 },
    ],
  },
  {
    patient: 'patient02',
    episodes: [
      { doctor: 'doctor03', condition: 'burnout', startDaysAgo: 210, visits: 5, cadenceDays: 21 },
      { doctor: 'doctor09', condition: 'nicotine', startDaysAgo: 150, visits: 4, cadenceDays: 18 },
      { doctor: 'doctor19', condition: 'sinusitis', startDaysAgo: 95, visits: 2, cadenceDays: 10 },
      { doctor: 'doctor14', condition: 'seb_derm', startDaysAgo: 40, visits: 1, cadenceDays: 1 },
    ],
  },
  {
    // Reference patient (Youssef Hassan, penicillin allergy): mild depressive
    // episode managed monthly by doctor03 with escitalopram 10 -> 15 mg;
    // seasonal allergic rhinitis with ENT (not cardiology); borderline fasting
    // glucose followed by internal medicine; a cardiology BP screening with no
    // prescription; one dermatology and two dental teleconsultations.
    patient: 'patient03',
    episodes: [
      { doctor: 'doctor03', condition: 'depression_mild', startDaysAgo: 238, visits: 9, cadenceDays: 28 },
      { doctor: 'doctor19', condition: 'allergic_rhinitis', startDaysAgo: 62, visits: 2, cadenceDays: 40 },
      { doctor: 'doctor16', condition: 'prediabetes', startDaysAgo: 170, visits: 3, cadenceDays: 75 },
      { doctor: 'doctor12', condition: 'bp_screening', startDaysAgo: 140, visits: 2, cadenceDays: 25 },
      { doctor: 'doctor14', condition: 'eczema', startDaysAgo: 110, visits: 1, cadenceDays: 1 },
      { doctor: 'doctor18', condition: 'dental_checkup', startDaysAgo: 75, visits: 2, cadenceDays: 20 },
    ],
    pinned: [
      { doctor: 'doctor03', condition: 'depression_mild', dayOffset: 1, slot: 'any', outcome: 'confirmed' },
      { doctor: 'doctor16', condition: 'prediabetes', dayOffset: 7, slot: 'any', outcome: 'rescheduledThenConfirmed', originalDayOffset: 4 },
      { doctor: 'doctor20', condition: 'dry_eye', dayOffset: 6, slot: 'any', outcome: 'pendingApproval' },
    ],
  },
  {
    patient: 'patient04',
    episodes: [
      { doctor: 'doctor03', condition: 'adjustment', startDaysAgo: 260, visits: 2, cadenceDays: 14 },
      { doctor: 'doctor04', condition: 'panic', startDaysAgo: 230, visits: 9, cadenceDays: 21 },
      { doctor: 'doctor14', condition: 'acne', startDaysAgo: 120, visits: 3, cadenceDays: 56 },
      { doctor: 'doctor20', condition: 'myopia', startDaysAgo: 60, visits: 2, cadenceDays: 21 },
    ],
  },
  {
    patient: 'patient05',
    episodes: [
      { doctor: 'doctor16', condition: 'iron_deficiency', startDaysAgo: 205, visits: 2, cadenceDays: 45 },
      { doctor: 'doctor06', condition: 'postpartum_depression', startDaysAgo: 200, visits: 6, cadenceDays: 28 },
      { doctor: 'doctor15', condition: 'pediatric', startDaysAgo: 190, visits: 4, cadenceDays: 45 },
      { doctor: 'doctor03', condition: 'adjustment', startDaysAgo: 50, visits: 2, cadenceDays: 21 },
    ],
    pinned: [{ doctor: 'doctor03', condition: 'adjustment', dayOffset: 0, slot: 'laterToday', outcome: 'confirmed' }],
  },
  {
    patient: 'patient06',
    episodes: [
      { doctor: 'doctor16', condition: 't2dm', startDaysAgo: 255, visits: 5, cadenceDays: 60 },
      { doctor: 'doctor20', condition: 'diabetic_eye_screen', startDaysAgo: 150, visits: 2, cadenceDays: 21 },
      { doctor: 'doctor12', condition: 'hyperlipidaemia', startDaysAgo: 130, visits: 3, cadenceDays: 50 },
      { doctor: 'doctor03', condition: 'adjustment', startDaysAgo: 90, visits: 2, cadenceDays: 21 },
    ],
  },
  {
    patient: 'patient07',
    episodes: [
      { doctor: 'doctor02', condition: 'gad', startDaysAgo: 220, visits: 7, cadenceDays: 28 },
      { doctor: 'doctor14', condition: 'acne', startDaysAgo: 160, visits: 2, cadenceDays: 56 },
      { doctor: 'doctor10', condition: 'insomnia', startDaysAgo: 100, visits: 3, cadenceDays: 21 },
      { doctor: 'doctor20', condition: 'dry_eye', startDaysAgo: 30, visits: 1, cadenceDays: 1 },
    ],
  },
  {
    patient: 'patient08',
    episodes: [
      { doctor: 'doctor12', condition: 'hypertension', startDaysAgo: 250, visits: 5, cadenceDays: 50 },
      { doctor: 'doctor17', condition: 'knee_oa', startDaysAgo: 180, visits: 3, cadenceDays: 35 },
      { doctor: 'doctor16', condition: 'gerd', startDaysAgo: 120, visits: 2, cadenceDays: 28 },
      { doctor: 'doctor13', condition: 'palpitations', startDaysAgo: 80, visits: 3, cadenceDays: 14 },
      { doctor: 'doctor03', condition: 'adjustment', startDaysAgo: 40, visits: 1, cadenceDays: 1 },
    ],
  },
  {
    patient: 'patient09',
    episodes: [
      { doctor: 'doctor08', condition: 'depression_recurrent', startDaysAgo: 235, visits: 7, cadenceDays: 30 },
      { doctor: 'doctor15', condition: 'pediatric', startDaysAgo: 200, visits: 3, cadenceDays: 60 },
      { doctor: 'doctor14', condition: 'hair_loss', startDaysAgo: 150, visits: 2, cadenceDays: 56 },
      { doctor: 'doctor03', condition: 'burnout', startDaysAgo: 63, visits: 3, cadenceDays: 21 },
    ],
    pinned: [{ doctor: 'doctor03', condition: 'burnout', dayOffset: 0, slot: 'soonAfterAnchor', outcome: 'confirmed' }],
  },
  {
    patient: 'patient10',
    episodes: [
      { doctor: 'doctor09', condition: 'nicotine', startDaysAgo: 220, visits: 4, cadenceDays: 18 },
      { doctor: 'doctor17', condition: 'low_back_pain', startDaysAgo: 160, visits: 3, cadenceDays: 21 },
      { doctor: 'doctor03', condition: 'adjustment', startDaysAgo: 110, visits: 3, cadenceDays: 21 },
      { doctor: 'doctor18', condition: 'dental_infection', startDaysAgo: 70, visits: 2, cadenceDays: 14 },
    ],
  },
  {
    patient: 'patient11',
    episodes: [
      { doctor: 'doctor19', condition: 'allergic_rhinitis', startDaysAgo: 230, visits: 3, cadenceDays: 60 },
      { doctor: 'doctor07', condition: 'ocd', startDaysAgo: 210, visits: 8, cadenceDays: 25 },
      { doctor: 'doctor20', condition: 'allergic_conjunctivitis', startDaysAgo: 200, visits: 1, cadenceDays: 1 },
      { doctor: 'doctor03', condition: 'burnout', startDaysAgo: 45, visits: 2, cadenceDays: 21 },
    ],
  },
  {
    patient: 'patient12',
    episodes: [
      { doctor: 'doctor10', condition: 'insomnia', startDaysAgo: 190, visits: 4, cadenceDays: 21 },
      { doctor: 'doctor03', condition: 'adjustment', startDaysAgo: 105, visits: 3, cadenceDays: 21 },
      { doctor: 'doctor14', condition: 'eczema', startDaysAgo: 80, visits: 2, cadenceDays: 28 },
      { doctor: 'doctor19', condition: 'otitis_media', startDaysAgo: 35, visits: 1, cadenceDays: 1 },
    ],
    pinned: [{ doctor: 'doctor03', condition: 'adjustment', dayOffset: 0, slot: 'earlierToday', outcome: 'completed' }],
  },
  {
    patient: 'patient13',
    episodes: [
      { doctor: 'doctor05', condition: 'bipolar_maintenance', startDaysAgo: 245, visits: 7, cadenceDays: 35 },
      { doctor: 'doctor03', condition: 'burnout', startDaysAgo: 160, visits: 2, cadenceDays: 21 },
      { doctor: 'doctor15', condition: 'pediatric', startDaysAgo: 140, visits: 2, cadenceDays: 50 },
      { doctor: 'doctor17', condition: 'ankle_sprain', startDaysAgo: 90, visits: 2, cadenceDays: 14 },
    ],
  },
  {
    patient: 'patient14',
    episodes: [
      { doctor: 'doctor04', condition: 'gad', startDaysAgo: 210, visits: 6, cadenceDays: 28 },
      { doctor: 'doctor14', condition: 'acne', startDaysAgo: 170, visits: 2, cadenceDays: 60 },
      { doctor: 'doctor02', condition: 'social_anxiety', startDaysAgo: 120, visits: 3, cadenceDays: 21 },
      { doctor: 'doctor20', condition: 'myopia', startDaysAgo: 50, visits: 2, cadenceDays: 14 },
    ],
  },
  {
    patient: 'patient15',
    episodes: [
      { doctor: 'doctor16', condition: 'asthma', startDaysAgo: 240, visits: 4, cadenceDays: 75 },
      { doctor: 'doctor13', condition: 'palpitations', startDaysAgo: 200, visits: 3, cadenceDays: 14 },
      { doctor: 'doctor19', condition: 'sinusitis', startDaysAgo: 130, visits: 2, cadenceDays: 10 },
      { doctor: 'doctor03', condition: 'burnout', startDaysAgo: 100, visits: 3, cadenceDays: 21 },
      { doctor: 'doctor17', condition: 'neck_pain', startDaysAgo: 50, visits: 1, cadenceDays: 1 },
    ],
  },
  {
    patient: 'patient16',
    episodes: [
      { doctor: 'doctor06', condition: 'adjustment', startDaysAgo: 262, visits: 1, cadenceDays: 1 },
      { doctor: 'doctor03', condition: 'gad', startDaysAgo: 228, visits: 8, cadenceDays: 28 },
      { doctor: 'doctor15', condition: 'pediatric', startDaysAgo: 170, visits: 2, cadenceDays: 70 },
      { doctor: 'doctor14', condition: 'seb_derm', startDaysAgo: 90, visits: 1, cadenceDays: 1 },
      { doctor: 'doctor12', condition: 'bp_screening', startDaysAgo: 60, visits: 1, cadenceDays: 1 },
    ],
    pinned: [
      { doctor: 'doctor03', condition: 'gad', dayOffset: 0, slot: 'earlierToday', outcome: 'completed' },
      { doctor: 'doctor03', condition: 'gad', dayOffset: 10, slot: 'any', outcome: 'rescheduledThenConfirmed', originalDayOffset: 6 },
    ],
  },
  {
    // Identity verification suspended three weeks before the anchor: no
    // activity after that point, no upcoming bookings.
    patient: 'patient17',
    inactiveAfterDaysAgo: 21,
    episodes: [
      { doctor: 'doctor09', condition: 'nicotine', startDaysAgo: 240, visits: 3, cadenceDays: 18 },
      { doctor: 'doctor11', condition: 'depression_recurrent', startDaysAgo: 200, visits: 3, cadenceDays: 30 },
      { doctor: 'doctor17', condition: 'ankle_sprain', startDaysAgo: 120, visits: 1, cadenceDays: 1 },
    ],
  },
  {
    patient: 'patient18',
    episodes: [
      { doctor: 'doctor11', condition: 'depression_recurrent', startDaysAgo: 230, visits: 7, cadenceDays: 30 },
      { doctor: 'doctor15', condition: 'pediatric', startDaysAgo: 210, visits: 3, cadenceDays: 60 },
      { doctor: 'doctor16', condition: 'hypothyroidism', startDaysAgo: 150, visits: 3, cadenceDays: 45 },
      { doctor: 'doctor03', condition: 'burnout', startDaysAgo: 70, visits: 1, cadenceDays: 1 },
    ],
  },
  {
    patient: 'patient19',
    episodes: [
      { doctor: 'doctor02', condition: 'social_anxiety', startDaysAgo: 215, visits: 7, cadenceDays: 25 },
      { doctor: 'doctor18', condition: 'dental_infection', startDaysAgo: 150, visits: 2, cadenceDays: 14 },
      { doctor: 'doctor17', condition: 'ankle_sprain', startDaysAgo: 100, visits: 2, cadenceDays: 14 },
      { doctor: 'doctor10', condition: 'insomnia', startDaysAgo: 50, visits: 2, cadenceDays: 21 },
    ],
  },
  {
    patient: 'patient20',
    episodes: [
      { doctor: 'doctor10', condition: 'insomnia', startDaysAgo: 200, visits: 3, cadenceDays: 28 },
      { doctor: 'doctor14', condition: 'acne', startDaysAgo: 180, visits: 3, cadenceDays: 56 },
      { doctor: 'doctor02', condition: 'gad', startDaysAgo: 140, visits: 3, cadenceDays: 28 },
      { doctor: 'doctor20', condition: 'myopia', startDaysAgo: 100, visits: 2, cadenceDays: 21 },
      { doctor: 'doctor03', condition: 'adjustment', startDaysAgo: 30, visits: 1, cadenceDays: 1 },
    ],
    pinned: [{ doctor: 'doctor03', condition: 'adjustment', dayOffset: 0, slot: 'laterToday', outcome: 'confirmed' }],
  },
];

/**
 * Specialty focus each doctor's top-up episodes are drawn from -- matches the
 * doctor's own biography in demo-people.ts (doctor06 sees women only, per her
 * women's-mental-health practice).
 */
export const DOCTOR_FOCUS: Record<string, { conditions: string[]; femaleOnly?: boolean }> = {
  doctor01: { conditions: ['depression_mild', 'depression_recurrent'] },
  doctor02: { conditions: ['gad', 'social_anxiety'] },
  doctor03: { conditions: ['adjustment', 'burnout'] },
  doctor04: { conditions: ['gad', 'panic'] },
  doctor05: { conditions: ['depression_recurrent', 'depression_mild'] },
  doctor06: { conditions: ['gad', 'depression_mild'], femaleOnly: true },
  doctor07: { conditions: ['gad', 'panic', 'ocd'] },
  doctor08: { conditions: ['depression_recurrent', 'depression_mild'] },
  doctor09: { conditions: ['nicotine'] },
  doctor10: { conditions: ['insomnia', 'adjustment'] },
  doctor11: { conditions: ['depression_recurrent', 'adjustment'] },
  doctor12: { conditions: ['bp_screening', 'hypertension'] },
  doctor13: { conditions: ['palpitations', 'bp_screening'] },
  doctor14: { conditions: ['acne', 'eczema', 'seb_derm'] },
  doctor15: { conditions: ['pediatric'] },
  doctor16: { conditions: ['vitamin_d', 'gerd'] },
  doctor17: { conditions: ['low_back_pain', 'neck_pain', 'ankle_sprain'] },
  doctor18: { conditions: ['dental_checkup', 'dental_infection'] },
  doctor19: { conditions: ['allergic_rhinitis', 'sinusitis', 'otitis_media'] },
  doctor20: { conditions: ['myopia', 'dry_eye', 'allergic_conjunctivitis'] },
};

/** Patients who are parents of a young child (paediatric parent-guidance consultations only go to them). */
export const PARENT_PATIENTS = new Set(['patient01', 'patient05', 'patient09', 'patient13', 'patient16', 'patient18']);

/** Minimum completed consultations every demo doctor must reach. */
export const MIN_COMPLETED_PER_DOCTOR = 15;
/** Minimum confirmed/pending upcoming bookings every practising doctor must have. */
export const MIN_UPCOMING_PER_DOCTOR = 2;

/**
 * How doctors are rated: the per-doctor mean the review generator centres on
 * (doctor04's lower mean is the existing seed's deliberate below-threshold
 * doctor for the directory's rating filter, kept).
 */
export const DOCTOR_RATING_MEAN: Record<string, number> = {
  doctor01: 4.7, doctor02: 4.6, doctor03: 4.6, doctor04: 3.4, doctor05: 4.8,
  doctor06: 4.7, doctor07: 4.5, doctor08: 4.9, doctor09: 4.4, doctor10: 4.3,
  doctor11: 4.5, doctor12: 4.7, doctor13: 4.4, doctor14: 4.6, doctor15: 4.8,
  doctor16: 4.5, doctor17: 4.6, doctor18: 4.3, doctor19: 4.5, doctor20: 4.2,
};

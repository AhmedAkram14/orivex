/**
 * Demo timeline -- the specialty-coherent clinical catalog.
 *
 * Every condition a demo doctor records belongs to that doctor's own specialty,
 * every medication carries the allergy class it must never be given against,
 * and SOAP notes are composed from phase-specific fragments (first visit /
 * follow-up / improving) filled with the encounter's own numbers, so no two
 * notes read the same.
 *
 * ICD-11 codes: the schema has no ICD-11 column (HealthGraphNode has free text
 * only), so a code -- when one is given -- is written into the description the
 * way a clinician would. A code is only included where it is a well-known
 * ICD-11 code; the rest stay uncoded rather than guessed.
 *
 * All content is synthetic demo material, not medical advice.
 */

export type Specialty =
  | 'Psychiatry'
  | 'Cardiology'
  | 'Dermatology'
  | 'Pediatrics'
  | 'Internal Medicine'
  | 'Orthopedics'
  | 'Dentistry'
  | 'Otolaryngology (ENT)'
  | 'Ophthalmology';

export type VitalKind = 'weight' | 'bp' | 'sugar';

export type AllergyClass = 'penicillin' | 'nsaid' | 'sulfa' | 'macrolide';

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
  /** A patient allergic to this class must never be prescribed this drug. */
  allergyClass?: AllergyClass;
}

export type Phase = 'initial' | 'followUp' | 'improving' | 'closing';

export interface SoapFragments {
  s: Record<Phase, readonly string[]>;
  o: Record<Phase, readonly string[]>;
  a: Record<Phase, readonly string[]>;
  p: Record<Phase, readonly string[]>;
}

export interface ConditionSpec {
  key: string;
  specialty: Specialty;
  /** Health-graph description (ICD-11 code appended when one is well known). */
  label: string;
  /** Reason the patient gives when booking, by phase. */
  reasons: Record<'initial' | 'followUp', readonly string[]>;
  soap: SoapFragments;
  /** Medication course by visit index (the last entry repeats). Empty = no prescription for this condition. */
  regimen: readonly (readonly Medication[])[];
  /** Penicillin-safe (etc.) alternatives used when the regimen conflicts with an allergy. */
  alternatives?: Partial<Record<AllergyClass, readonly Medication[]>>;
  labs?: readonly { test: string; reason: string; instructions?: string }[];
  vitals: readonly VitalKind[];
  /** Suspected on the first visit, confirmed on the second (a superseding node). */
  confirmsOnSecondVisit?: boolean;
  journey: 'ongoing_chronic' | 'monitoring' | 'resolved' | 'follow_up';
  followUp?: readonly string[];
  /** A differential the doctor rules out during the work-up. */
  ruledOut?: { label: string; afterLab: string };
}

const same = (lines: readonly string[]): Record<Phase, readonly string[]> => ({
  initial: lines,
  followUp: lines,
  improving: lines,
  closing: lines,
});

// ---------------------------------------------------------------------------
// Psychiatry
// ---------------------------------------------------------------------------
const PSYCH_O_COMMON = [
  'Video consultation. Appropriately dressed, good eye contact, speech normal in rate and volume. {vitalsLine}',
  'Alert and oriented, cooperative throughout. Thought process linear, no perceptual disturbance. {vitalsLine}',
  'Engaged well on video. Affect reactive, no psychomotor change observed. {vitalsLine}',
];

export const CONDITIONS: Record<string, ConditionSpec> = {
  depression_mild: {
    key: 'depression_mild',
    specialty: 'Psychiatry',
    label: 'Single episode depressive disorder, mild (ICD-11 6A70.0)',
    reasons: {
      initial: ['Low mood and poor sleep for the past six weeks', 'Feeling flat and losing interest in things I used to enjoy'],
      followUp: ['Follow-up on mood and medication', 'Monthly review of mood and escitalopram', 'Medication review and progress check'],
    },
    soap: {
      s: {
        initial: [
          '{first} reports six weeks of low mood, early-morning waking and reduced interest in weekend activities. Concentration at work is down. No suicidal ideation. PHQ-9 {phq}.',
          '{first} describes persistent low mood since a period of heavy workload, with poor appetite and broken sleep. Denies thoughts of self-harm. PHQ-9 {phq}.',
        ],
        followUp: [
          '{first} has taken {med} daily for {weeks} weeks without missed doses. Mild nausea in week one has settled. Sleep slightly better; mood "a bit lighter". PHQ-9 {phq}.',
          'Adherent to {med}. Reports partial improvement in energy, still some low days mid-week. No side effects of concern. PHQ-9 {phq}.',
        ],
        improving: [
          '{first} feels "back to normal most days". Exercising twice a week again and back to full duties at work. PHQ-9 {phq}.',
          'Mood stable for the past month, sleeping 7 hours. Enjoying time with family again. PHQ-9 {phq}.',
        ],
        closing: [
          'Sustained remission for three months. {first} asks about the plan for eventually stopping medication. PHQ-9 {phq}.',
        ],
      },
      o: same(PSYCH_O_COMMON),
      a: {
        initial: ['Presentation consistent with a mild single depressive episode. Low risk.', 'Mild depressive episode; functioning largely preserved. Risk assessed as low.'],
        followUp: ['Partial response to SSRI at current dose; tolerating well.', 'Improving but sub-therapeutic response; dose adjustment indicated.'],
        improving: ['Good response to treatment; approaching remission.', 'Responding well; continue current dose.'],
        closing: ['In remission on maintenance dose.'],
      },
      p: {
        initial: [
          'Start {med}. Psychoeducation on expected onset (2-4 weeks) and side effects. Sleep hygiene plan agreed. Baseline bloods requested. Review in 4 weeks.',
          'Commence {med} with weekly CBT-style behavioural activation tasks. Safety plan discussed. Bloods requested. Review in 4 weeks.',
        ],
        followUp: ['{change} Continue behavioural activation. Review in 4 weeks.', '{change} Reinforced sleep routine. Next review in 4 weeks.'],
        improving: ['Continue {med}. Maintain exercise routine. Review in 6 weeks.', 'No change to treatment. Relapse-prevention plan written together. Review in 6 weeks.'],
        closing: ['Continue {med} for a further 6 months before a gradual taper. Return earlier if symptoms recur.'],
      },
    },
    regimen: [
      [{ name: 'Escitalopram', dosage: '10 mg tablet', frequency: 'Once daily in the morning', durationDays: 30, instructions: 'Take with or without food. Do not stop suddenly.' }],
      [{ name: 'Escitalopram', dosage: '10 mg tablet', frequency: 'Once daily in the morning', durationDays: 30, instructions: 'Take with or without food. Do not stop suddenly.' }],
      [{ name: 'Escitalopram', dosage: '15 mg (one and a half 10 mg tablets)', frequency: 'Once daily in the morning', durationDays: 30, instructions: 'Dose increased from 10 mg. Do not stop suddenly.' }],
      [{ name: 'Escitalopram', dosage: '15 mg (one and a half 10 mg tablets)', frequency: 'Once daily in the morning', durationDays: 45, instructions: 'Maintenance dose. Do not stop suddenly.' }],
    ],
    labs: [
      { test: 'Thyroid-stimulating hormone (TSH)', reason: 'Exclude thyroid cause of low mood' },
      { test: 'Complete blood count (CBC)', reason: 'Baseline before SSRI' },
      { test: 'Vitamin D (25-OH)', reason: 'Fatigue and low mood work-up' },
    ],
    vitals: ['weight', 'bp'],
    journey: 'monitoring',
    followUp: ['Mood and medication review', 'Check response to the dose increase'],
    ruledOut: { label: 'Hypothyroidism (ICD-11 5A00)', afterLab: 'TSH within normal range' },
  },

  depression_recurrent: {
    key: 'depression_recurrent',
    specialty: 'Psychiatry',
    label: 'Recurrent depressive disorder, current episode moderate (ICD-11 6A71.1)',
    reasons: {
      initial: ['Depression has come back after two good years', 'Second opinion on long-standing depression'],
      followUp: ['Ongoing treatment review', 'Medication and therapy follow-up'],
    },
    soap: {
      s: {
        initial: ['{first} reports return of low mood, anhedonia and fatigue over two months; previous episode treated successfully in 2023. Denies suicidal intent. PHQ-9 {phq}.'],
        followUp: ['{first} reports steady but slow improvement on {med}; still tired in the afternoons. Attending weekly therapy. PHQ-9 {phq}.'],
        improving: ['{first} describes clear improvement, more motivation and better sleep. PHQ-9 {phq}.'],
        closing: ['Mood stable, functioning well at work and at home. PHQ-9 {phq}.'],
      },
      o: same(PSYCH_O_COMMON),
      a: {
        initial: ['Recurrent depressive disorder, current moderate episode. Risk low, protective factors strong.'],
        followUp: ['Partial response; tolerating medication.'],
        improving: ['Good response; continue.'],
        closing: ['Remission on maintenance treatment.'],
      },
      p: {
        initial: ['Start {med}; combined with weekly CBT. Review in 3-4 weeks.'],
        followUp: ['{change} Continue CBT. Review in 4 weeks.'],
        improving: ['Continue {med}. Review in 6 weeks.'],
        closing: ['Maintenance for at least 12 months given recurrence. Review in 8 weeks.'],
      },
    },
    regimen: [
      [{ name: 'Sertraline', dosage: '50 mg tablet', frequency: 'Once daily', durationDays: 30, instructions: 'Take after breakfast.' }],
      [{ name: 'Sertraline', dosage: '100 mg (two 50 mg tablets)', frequency: 'Once daily', durationDays: 30, instructions: 'Dose increased. Take after breakfast.' }],
      [{ name: 'Sertraline', dosage: '100 mg (two 50 mg tablets)', frequency: 'Once daily', durationDays: 60, instructions: 'Maintenance dose.' }],
    ],
    labs: [{ test: 'Thyroid-stimulating hormone (TSH)', reason: 'Recurrent low mood work-up' }],
    vitals: ['weight', 'bp'],
    journey: 'ongoing_chronic',
    followUp: ['Monthly review of mood and sertraline'],
  },

  gad: {
    key: 'gad',
    specialty: 'Psychiatry',
    label: 'Generalised anxiety disorder (ICD-11 6B00)',
    reasons: {
      initial: ['Constant worry and tension most days', 'Feeling anxious all the time and cannot switch off'],
      followUp: ['Anxiety follow-up', 'Review of sertraline and breathing exercises'],
    },
    soap: {
      s: {
        initial: ['{first} describes excessive worry about work and family for over six months, with muscle tension and difficulty falling asleep. GAD-7 {gad}.'],
        followUp: ['{first} has used the breathing exercises daily and taken {med} as prescribed for {weeks} weeks. Worry "more manageable". GAD-7 {gad}.'],
        improving: ['{first} reports far fewer anxious days; sleeping through most nights. GAD-7 {gad}.'],
        closing: ['Anxiety well controlled; {first} feels confident using the coping plan. GAD-7 {gad}.'],
      },
      o: same(PSYCH_O_COMMON),
      a: {
        initial: ['Generalised anxiety disorder, moderate severity. No comorbid depression on screening.'],
        followUp: ['Responding to SSRI and CBT techniques.'],
        improving: ['Marked improvement in anxiety symptoms.'],
        closing: ['GAD in remission.'],
      },
      p: {
        initial: ['Start {med} at a low dose. Taught diaphragmatic breathing and worry-time technique. Review in 4 weeks.'],
        followUp: ['{change} Continue daily practice. Review in 4 weeks.'],
        improving: ['Continue {med}. Review in 6 weeks.'],
        closing: ['Continue for 6 more months, then consider taper.'],
      },
    },
    regimen: [
      [{ name: 'Sertraline', dosage: '25 mg (half a 50 mg tablet)', frequency: 'Once daily', durationDays: 14, instructions: 'Increase to 50 mg after two weeks as discussed.' }],
      [{ name: 'Sertraline', dosage: '50 mg tablet', frequency: 'Once daily', durationDays: 30 }],
      [{ name: 'Sertraline', dosage: '50 mg tablet', frequency: 'Once daily', durationDays: 60 }],
    ],
    labs: [{ test: 'Thyroid-stimulating hormone (TSH)', reason: 'Exclude hyperthyroidism as a cause of anxiety' }],
    vitals: ['bp'],
    journey: 'monitoring',
    followUp: ['Anxiety review'],
  },

  panic: {
    key: 'panic',
    specialty: 'Psychiatry',
    label: 'Panic disorder (ICD-11 6B01)',
    reasons: {
      initial: ['Sudden attacks of racing heart and fear', 'Panic attacks on the metro'],
      followUp: ['Panic attacks follow-up', 'Review of treatment for panic attacks'],
    },
    soap: {
      s: {
        initial: ['{first} reports recurrent unexpected attacks of palpitations, breathlessness and fear of dying, about twice weekly for two months. Avoiding public transport. Cardiac check by GP normal.'],
        followUp: ['Attacks down to roughly one a week. {first} practised interoceptive exposure as agreed. Taking {med} daily.'],
        improving: ['No full attacks in three weeks; using the metro again with mild anticipatory anxiety.'],
        closing: ['Attack-free for over a month. Confident in coping strategies.'],
      },
      o: same(PSYCH_O_COMMON),
      a: { initial: ['Panic disorder with developing avoidance.'], followUp: ['Improving with SSRI and exposure work.'], improving: ['Good response.'], closing: ['Panic disorder in remission.'] },
      p: {
        initial: ['Psychoeducation on the panic cycle. Start {med}. Graded exposure hierarchy drafted. Review in 3 weeks.'],
        followUp: ['{change} Next exposure steps agreed. Review in 4 weeks.'],
        improving: ['Continue {med} and exposure practice. Review in 6 weeks.'],
        closing: ['Continue medication for 6-12 months. Relapse plan given.'],
      },
    },
    regimen: [
      [{ name: 'Sertraline', dosage: '25 mg (half a 50 mg tablet)', frequency: 'Once daily', durationDays: 14, instructions: 'Increase to 50 mg after two weeks.' }],
      [{ name: 'Sertraline', dosage: '50 mg tablet', frequency: 'Once daily', durationDays: 30 }],
    ],
    vitals: ['bp'],
    journey: 'monitoring',
    followUp: ['Panic disorder review'],
  },

  social_anxiety: {
    key: 'social_anxiety',
    specialty: 'Psychiatry',
    label: 'Social anxiety disorder (ICD-11 6B04)',
    reasons: { initial: ['Very anxious speaking in class and meetings'], followUp: ['Social anxiety follow-up'] },
    soap: {
      s: {
        initial: ['{first} avoids presentations and group settings because of fear of embarrassment; blushing and shaking when speaking up. Symptoms since secondary school.'],
        followUp: ['{first} completed two of the agreed exposure tasks (asking a question in a lecture, ordering by phone).'],
        improving: ['{first} gave a short presentation with manageable anxiety.'],
        closing: ['Participating in group activities with much less distress.'],
      },
      o: same(PSYCH_O_COMMON),
      a: { initial: ['Social anxiety disorder, moderate.'], followUp: ['Progressing with graded exposure.'], improving: ['Clear improvement.'], closing: ['Largely resolved.'] },
      p: {
        initial: ['CBT for social anxiety; exposure hierarchy built together. Consider SSRI if limited progress. Review in 3 weeks.'],
        followUp: ['Next exposure steps agreed. Review in 3 weeks.'],
        improving: ['Continue CBT. Review in 4 weeks.'],
        closing: ['Discharge to self-practice with booster session if needed.'],
      },
    },
    regimen: [],
    vitals: [],
    journey: 'resolved',
    followUp: ['CBT session'],
  },

  ocd: {
    key: 'ocd',
    specialty: 'Psychiatry',
    label: 'Obsessive-compulsive disorder (ICD-11 6B20)',
    reasons: { initial: ['Checking and washing rituals taking hours a day'], followUp: ['OCD treatment review', 'Exposure and response prevention follow-up'] },
    soap: {
      s: {
        initial: ['{first} reports intrusive contamination thoughts with hand-washing up to 2 hours daily and repeated checking of locks. Y-BOCS {ybocs}.'],
        followUp: ['{first} has reduced washing time with ERP homework; on {med} for {weeks} weeks. Y-BOCS {ybocs}.'],
        improving: ['Rituals now under 30 minutes daily. Y-BOCS {ybocs}.'],
        closing: ['Symptoms well controlled; occasional urges resisted. Y-BOCS {ybocs}.'],
      },
      o: same(PSYCH_O_COMMON),
      a: { initial: ['OCD, moderate-to-severe, good insight.'], followUp: ['Partial response; higher SSRI dose usually needed in OCD.'], improving: ['Good response to ERP and fluoxetine.'], closing: ['OCD in partial remission.'] },
      p: {
        initial: ['Start {med}; begin ERP with a first exposure hierarchy. Review in 4 weeks.'],
        followUp: ['{change} Continue ERP homework. Review in 4 weeks.'],
        improving: ['Continue {med}. Review in 6 weeks.'],
        closing: ['Maintain dose for 12 months. Booster ERP sessions as needed.'],
      },
    },
    regimen: [
      [{ name: 'Fluoxetine', dosage: '20 mg capsule', frequency: 'Once daily in the morning', durationDays: 30 }],
      [{ name: 'Fluoxetine', dosage: '40 mg (two 20 mg capsules)', frequency: 'Once daily in the morning', durationDays: 30, instructions: 'Dose increased.' }],
      [{ name: 'Fluoxetine', dosage: '40 mg (two 20 mg capsules)', frequency: 'Once daily in the morning', durationDays: 60 }],
    ],
    vitals: ['weight'],
    journey: 'ongoing_chronic',
    followUp: ['ERP progress review'],
  },

  adjustment: {
    key: 'adjustment',
    specialty: 'Psychiatry',
    label: 'Adjustment disorder (ICD-11 6B43)',
    reasons: {
      initial: ['Struggling since a big change at work', 'Stress and poor sleep after relocating', 'Hard time coping since a family change'],
      followUp: ['Follow-up on coping and sleep', 'Stress management follow-up'],
    },
    soap: {
      s: {
        initial: [
          '{first} reports worry, irritability and poor sleep since a major change in role four weeks ago. Coping at home but dreading work. No prior psychiatric history.',
          '{first} describes feeling overwhelmed after a recent move, with tearfulness and difficulty settling. No self-harm thoughts.',
        ],
        followUp: ['{first} has used the problem-solving worksheet and set clearer work boundaries. Sleep improving.'],
        improving: ['{first} reports feeling settled and more in control.'],
        closing: ['Symptoms resolved; {first} feels ready to stop regular sessions.'],
      },
      o: same(PSYCH_O_COMMON),
      a: { initial: ['Adjustment disorder with anxious mood, clear stressor, time-limited course expected.'], followUp: ['Improving with brief therapy.'], improving: ['Near resolution.'], closing: ['Resolved.'] },
      p: {
        initial: ['Brief problem-solving therapy; sleep routine. Short course of a sleep aid if needed. Review in 3 weeks.'],
        followUp: ['Continue strategies. Review in 4 weeks.'],
        improving: ['One more session to consolidate.'],
        closing: ['Discharged; return if needed.'],
      },
    },
    regimen: [[{ name: 'Trazodone', dosage: '50 mg tablet', frequency: 'At bedtime when needed', durationDays: 14, instructions: 'For sleep only, not more than 4 nights a week.' }], []],
    vitals: ['bp'],
    journey: 'resolved',
    followUp: ['Coping and sleep review'],
  },

  burnout: {
    key: 'burnout',
    specialty: 'Psychiatry',
    label: 'Burn-out (ICD-11 QD85)',
    reasons: {
      initial: ['Exhausted and detached from work', 'Burnout from long working hours'],
      followUp: ['Burnout recovery follow-up', 'Return-to-work planning'],
    },
    soap: {
      s: {
        initial: ['{first} works 60-hour weeks and reports emotional exhaustion, cynicism about the job and reduced effectiveness for four months. Weekends spent recovering. Mood otherwise preserved.'],
        followUp: ['{first} negotiated reduced overtime and protected lunch breaks. Energy slowly returning.'],
        improving: ['{first} reports feeling "like myself again" at work, with clearer boundaries.'],
        closing: ['Sustained recovery; plans to keep the new routine.'],
      },
      o: same(PSYCH_O_COMMON),
      a: { initial: ['Occupational burn-out without major depressive episode.'], followUp: ['Recovering as workload is adjusted.'], improving: ['Good recovery.'], closing: ['Resolved.'] },
      p: {
        initial: ['Short-course CBT for workplace stress; energy diary; discussed workload conversation with manager. Review in 3 weeks.'],
        followUp: ['Continue boundaries plan. Review in 4 weeks.'],
        improving: ['Relapse-prevention plan. Review in 6 weeks.'],
        closing: ['Discharged with self-help plan.'],
      },
    },
    regimen: [],
    vitals: ['bp', 'weight'],
    journey: 'resolved',
    followUp: ['Workload and energy review'],
  },

  insomnia: {
    key: 'insomnia',
    specialty: 'Psychiatry',
    label: 'Chronic insomnia (ICD-11 7A00)',
    reasons: { initial: ['Cannot fall asleep before 3 am', 'Poor sleep for months'], followUp: ['Sleep follow-up', 'Review of sleep diary'] },
    soap: {
      s: {
        initial: ['{first} takes over an hour to fall asleep most nights for four months, waking unrefreshed. Screen use in bed until late. Sleep diary started.'],
        followUp: ['Sleep diary shows sleep onset now around 45 minutes. {first} stopped screens an hour before bed.'],
        improving: ['Falling asleep within 20-30 minutes on most nights.'],
        closing: ['Sleeping well without medication.'],
      },
      o: same(PSYCH_O_COMMON),
      a: { initial: ['Chronic insomnia with behavioural contributors.'], followUp: ['Improving with CBT-I.'], improving: ['Good response.'], closing: ['Resolved.'] },
      p: {
        initial: ['CBT-I: stimulus control, fixed wake time. Short course of melatonin. Review in 3 weeks.'],
        followUp: ['Tighten sleep window. Review in 4 weeks.'],
        improving: ['Stop melatonin; continue routine.'],
        closing: ['Discharged.'],
      },
    },
    regimen: [[{ name: 'Melatonin', dosage: '3 mg tablet', frequency: '1 hour before bedtime', durationDays: 21 }], []],
    vitals: [],
    journey: 'resolved',
    followUp: ['Sleep diary review'],
  },

  postpartum_depression: {
    key: 'postpartum_depression',
    specialty: 'Psychiatry',
    label: 'Depressive episode with postpartum onset (ICD-11 6E20)',
    reasons: { initial: ['Low mood since my baby was born'], followUp: ['Postpartum mood follow-up'] },
    soap: {
      s: {
        initial: ['{first} delivered four months ago. Reports low mood, tearfulness and guilt about not enjoying motherhood, with broken sleep. Breastfeeding. No thoughts of harming herself or the baby. EPDS {epds}.'],
        followUp: ['{first} reports better bonding and more support from family at night. On {med} for {weeks} weeks. EPDS {epds}.'],
        improving: ['Mood much improved; enjoying time with her baby. EPDS {epds}.'],
        closing: ['Recovered. EPDS {epds}.'],
      },
      o: same(PSYCH_O_COMMON),
      a: { initial: ['Moderate postpartum depression. Risk to self and infant assessed as low.'], followUp: ['Responding to treatment.'], improving: ['Good response.'], closing: ['Remission.'] },
      p: {
        initial: ['Start {med} (compatible with breastfeeding). Family support plan; night-feed sharing. Review in 3 weeks.'],
        followUp: ['Continue {med}. Review in 4 weeks.'],
        improving: ['Continue. Review in 6 weeks.'],
        closing: ['Continue for 6 months then taper.'],
      },
    },
    regimen: [
      [{ name: 'Sertraline', dosage: '50 mg tablet', frequency: 'Once daily', durationDays: 30, instructions: 'Compatible with breastfeeding.' }],
      [{ name: 'Sertraline', dosage: '50 mg tablet', frequency: 'Once daily', durationDays: 60, instructions: 'Compatible with breastfeeding.' }],
    ],
    vitals: ['weight', 'bp'],
    journey: 'monitoring',
    followUp: ['Postpartum mood review'],
  },

  bipolar_maintenance: {
    key: 'bipolar_maintenance',
    specialty: 'Psychiatry',
    label: 'Bipolar type II disorder (ICD-11 6A61)',
    reasons: { initial: ['Transferring care for bipolar disorder'], followUp: ['Mood stabiliser review'] },
    soap: {
      s: {
        initial: ['{first} has bipolar II diagnosed in 2021, stable on lamotrigine. Moving care to this clinic. Last depressive episode 18 months ago, no hypomania since.'],
        followUp: ['{first} reports stable mood and good sleep; mood chart shows no significant swings. Adherent to {med}.'],
        improving: ['Stable. Started a new job without mood disturbance.'],
        closing: ['Euthymic and stable.'],
      },
      o: same(PSYCH_O_COMMON),
      a: { initial: ['Bipolar II disorder, currently euthymic.'], followUp: ['Stable on maintenance treatment.'], improving: ['Stable.'], closing: ['Stable.'] },
      p: {
        initial: ['Continue {med}. Mood charting. Rash and adherence counselling repeated. Review in 6 weeks.'],
        followUp: ['Continue {med}. Review in 8 weeks.'],
        improving: ['No change. Review in 8 weeks.'],
        closing: ['No change. Review in 3 months.'],
      },
    },
    regimen: [[{ name: 'Lamotrigine', dosage: '200 mg tablet', frequency: 'Once daily', durationDays: 60, instructions: 'Report any rash immediately.' }]],
    labs: [
      { test: 'Liver function tests', reason: 'Routine monitoring on maintenance treatment' },
      { test: 'Complete blood count (CBC)', reason: 'Routine monitoring' },
    ],
    vitals: ['weight', 'bp'],
    journey: 'ongoing_chronic',
    followUp: ['Mood stabiliser review'],
  },

  nicotine: {
    key: 'nicotine',
    specialty: 'Psychiatry',
    label: 'Nicotine dependence (ICD-11 6C4A.2)',
    reasons: { initial: ['Want to quit smoking for good'], followUp: ['Smoking cessation follow-up'] },
    soap: {
      s: {
        initial: ['{first} smokes about 20 cigarettes a day for 10 years; two failed quit attempts. Motivated after a recent chest infection. First cigarette within 10 minutes of waking.'],
        followUp: ['Quit date passed. {first} down to 2-3 cigarettes a day using {med}. Cravings worst after meals.'],
        improving: ['Smoke-free for {weeks} weeks. Occasional cravings managed with gum and walking.'],
        closing: ['Smoke-free for three months.'],
      },
      o: same(PSYCH_O_COMMON),
      a: { initial: ['Nicotine dependence, high motivation to quit.'], followUp: ['Good early progress.'], improving: ['Abstinent.'], closing: ['Sustained abstinence.'] },
      p: {
        initial: ['Set quit date in 7 days. Start {med}. Behavioural support plan. Review in 2 weeks.'],
        followUp: ['Continue {med}. Trigger plan for after meals. Review in 3 weeks.'],
        improving: ['Step down nicotine patch strength. Review in 4 weeks.'],
        closing: ['Finish NRT course. Discharged with relapse plan.'],
      },
    },
    regimen: [
      [{ name: 'Nicotine transdermal patch', dosage: '21 mg/24 h patch', frequency: 'One patch daily', durationDays: 28, instructions: 'Apply to clean, hairless skin; rotate sites.' }],
      [{ name: 'Nicotine transdermal patch', dosage: '14 mg/24 h patch', frequency: 'One patch daily', durationDays: 28, instructions: 'Step-down dose.' }],
      [{ name: 'Nicotine transdermal patch', dosage: '7 mg/24 h patch', frequency: 'One patch daily', durationDays: 21, instructions: 'Final step-down dose.' }],
    ],
    vitals: ['weight', 'bp'],
    journey: 'resolved',
    followUp: ['Quit progress review'],
  },

  // -------------------------------------------------------------------------
  // Cardiology
  // -------------------------------------------------------------------------
  hypertension: {
    key: 'hypertension',
    specialty: 'Cardiology',
    label: 'Essential hypertension (ICD-11 BA00)',
    reasons: { initial: ['High blood pressure readings at home', 'Blood pressure review'], followUp: ['Blood pressure follow-up', 'Review of home BP readings'] },
    soap: {
      s: {
        initial: ['{first} reports home readings consistently above 140/90 for a month. Occasional morning headaches. No chest pain or breathlessness. Family history of hypertension.'],
        followUp: ['{first} brought a two-week home BP log. Taking {med} daily, no ankle swelling. Reduced salt intake.'],
        improving: ['Home readings mostly in target. Walking 30 minutes most days.'],
        closing: ['Well controlled on current treatment.'],
      },
      o: same(['Home cuff reading reviewed on video: {bpText}. {weightText}', 'Readings from home monitor shared on screen: {bpText}. {weightText}']),
      a: { initial: ['Essential hypertension, stage 1-2. No features of target-organ damage reported.'], followUp: ['Improving control.'], improving: ['At target.'], closing: ['Controlled.'] },
      p: {
        initial: ['Start {med}. Lifestyle advice: salt below 5 g/day, regular exercise. Bloods requested. Review in 4 weeks.'],
        followUp: ['{change} Continue home monitoring twice weekly. Review in 6 weeks.'],
        improving: ['Continue {med}. Review in 3 months.'],
        closing: ['Annual review; continue treatment.'],
      },
    },
    regimen: [
      [{ name: 'Amlodipine', dosage: '5 mg tablet', frequency: 'Once daily', durationDays: 30 }],
      [{ name: 'Amlodipine', dosage: '5 mg tablet', frequency: 'Once daily', durationDays: 60 }, { name: 'Losartan', dosage: '50 mg tablet', frequency: 'Once daily', durationDays: 60 }],
      [{ name: 'Amlodipine', dosage: '5 mg tablet', frequency: 'Once daily', durationDays: 90 }, { name: 'Losartan', dosage: '50 mg tablet', frequency: 'Once daily', durationDays: 90 }],
    ],
    labs: [
      { test: 'Lipid profile', reason: 'Cardiovascular risk assessment' },
      { test: 'Serum creatinine and electrolytes', reason: 'Baseline before ARB' },
    ],
    vitals: ['bp', 'weight'],
    journey: 'ongoing_chronic',
    followUp: ['BP review with home log'],
  },

  bp_screening: {
    key: 'bp_screening',
    specialty: 'Cardiology',
    label: 'Elevated blood pressure without diagnosis of hypertension',
    reasons: { initial: ['Cardiovascular check-up', 'Borderline blood pressure at work screening'], followUp: ['Follow-up of home BP readings'] },
    soap: {
      s: {
        initial: ['{first} had a borderline reading at a workplace screening. No symptoms. Non-smoker. Father had a heart attack at 62.'],
        followUp: ['{first} recorded home readings for three weeks as asked.'],
        improving: ['Home readings within normal range.'],
        closing: ['No further concerns.'],
      },
      o: same(['Home readings reviewed: {bpText}. {weightText}']),
      a: { initial: ['High-normal blood pressure; not hypertension at this stage.'], followUp: ['Home average below the treatment threshold.'], improving: ['Normal.'], closing: ['Normal.'] },
      p: {
        initial: ['No medication. Lifestyle advice; three weeks of home monitoring; lipid profile. Review with readings.'],
        followUp: ['No treatment needed. Recheck annually.'],
        improving: ['Annual check.'],
        closing: ['Annual check.'],
      },
    },
    regimen: [],
    labs: [{ test: 'Lipid profile', reason: 'Cardiovascular risk screening' }],
    vitals: ['bp', 'weight', 'sugar'],
    journey: 'resolved',
    followUp: ['Review home BP log'],
  },

  hyperlipidaemia: {
    key: 'hyperlipidaemia',
    specialty: 'Cardiology',
    label: 'Hypercholesterolaemia (ICD-11 5C80.0)',
    reasons: { initial: ['High cholesterol on blood test'], followUp: ['Cholesterol follow-up'] },
    soap: {
      s: {
        initial: ['{first} brought recent results showing LDL 4.6 mmol/L. Type 2 diabetes managed by internal medicine. No chest pain.'],
        followUp: ['Tolerating {med}; no muscle aches.'],
        improving: ['Repeat LDL improved.'],
        closing: ['At target.'],
      },
      o: same(['Reviewed shared results on screen. {bpText}. {weightText}']),
      a: { initial: ['Hypercholesterolaemia with diabetes: high cardiovascular risk, statin indicated.'], followUp: ['Tolerating statin.'], improving: ['Improving.'], closing: ['At target.'] },
      p: {
        initial: ['Start {med}. Diet advice. Repeat lipids in 8 weeks.'],
        followUp: ['Continue {med}. Repeat lipids in 3 months.'],
        improving: ['Continue.'],
        closing: ['Annual review.'],
      },
    },
    regimen: [[{ name: 'Atorvastatin', dosage: '20 mg tablet', frequency: 'Once daily at night', durationDays: 90 }]],
    labs: [{ test: 'Lipid profile', reason: 'Response to statin' }, { test: 'Liver function tests', reason: 'Baseline on statin' }],
    vitals: ['bp', 'weight'],
    journey: 'ongoing_chronic',
    followUp: ['Lipid review'],
  },

  palpitations: {
    key: 'palpitations',
    specialty: 'Cardiology',
    label: 'Palpitations, likely benign ectopic beats',
    reasons: { initial: ['Heart skipping beats', 'Episodes of fast heartbeat'], followUp: ['Holter results review', 'Palpitations follow-up'] },
    soap: {
      s: {
        initial: ['{first} notices "skipped beats" in the evening, worse with coffee and stress. No fainting or chest pain.'],
        followUp: ['Holter monitor completed last week. Symptoms less frequent after cutting caffeine.'],
        improving: ['Rare palpitations; reassured.'],
        closing: ['Asymptomatic.'],
      },
      o: same(['Home readings reviewed: {bpText}. Pulse regular during the call. {weightText}']),
      a: {
        initial: ['Palpitations, likely benign ectopy. Arrhythmia to be excluded.'],
        followUp: ['24-hour Holter: occasional atrial ectopics only, no sustained arrhythmia.'],
        improving: ['Benign ectopy.'],
        closing: ['Benign.'],
      },
      p: {
        initial: ['24-hour Holter and thyroid function. Reduce caffeine. Review with results.'],
        followUp: ['Reassurance. {change} Review if symptoms change.'],
        improving: ['Discharge to routine care.'],
        closing: ['Discharged.'],
      },
    },
    regimen: [[], [{ name: 'Bisoprolol', dosage: '1.25 mg (half a 2.5 mg tablet)', frequency: 'Once daily', durationDays: 30, instructions: 'Only if palpitations are bothersome.' }]],
    labs: [{ test: 'Thyroid function (TSH, free T4)', reason: 'Palpitations work-up' }, { test: 'Serum electrolytes', reason: 'Palpitations work-up' }],
    vitals: ['bp', 'weight'],
    confirmsOnSecondVisit: true,
    journey: 'resolved',
    followUp: ['Holter result review'],
    ruledOut: { label: 'Sustained arrhythmia', afterLab: '24-hour Holter without sustained arrhythmia' },
  },

  // -------------------------------------------------------------------------
  // Internal Medicine
  // -------------------------------------------------------------------------
  t2dm: {
    key: 't2dm',
    specialty: 'Internal Medicine',
    label: 'Type 2 diabetes mellitus (ICD-11 5A11)',
    reasons: { initial: ['Diabetes review'], followUp: ['Diabetes follow-up and HbA1c', 'Sugar readings review'] },
    soap: {
      s: {
        initial: ['{first} has had type 2 diabetes for 5 years on metformin. Recent fasting readings 140-160 mg/dL at home. No hypoglycaemia. Diet irregular during work travel.'],
        followUp: ['{first} brought a glucose log; readings improving after adjusting meal times. Taking {med} with meals.'],
        improving: ['Home fasting readings now mostly under 130 mg/dL.'],
        closing: ['Stable control.'],
      },
      o: same(['Home readings reviewed: fasting glucose {sugarText}. {bpText}. {weightText}']),
      a: { initial: ['T2DM, suboptimal control.'], followUp: ['Improving glycaemic control.'], improving: ['Good control.'], closing: ['Controlled.'] },
      p: {
        initial: ['{change} HbA1c, lipids, kidney function. Dietitian advice. Annual eye screening referral. Review in 6 weeks.'],
        followUp: ['Continue {med}. Review in 3 months with HbA1c.'],
        improving: ['Continue {med}. Review in 3 months.'],
        closing: ['Routine 3-monthly review.'],
      },
    },
    regimen: [
      [{ name: 'Metformin', dosage: '1000 mg tablet', frequency: 'Twice daily with meals', durationDays: 90, instructions: 'Dose increased from 500 mg twice daily.' }],
      [{ name: 'Metformin', dosage: '1000 mg tablet', frequency: 'Twice daily with meals', durationDays: 90 }],
    ],
    labs: [
      { test: 'HbA1c', reason: 'Glycaemic control' },
      { test: 'Urine albumin-to-creatinine ratio', reason: 'Kidney screening in diabetes' },
      { test: 'Serum creatinine and eGFR', reason: 'Metformin monitoring' },
    ],
    vitals: ['sugar', 'bp', 'weight'],
    journey: 'ongoing_chronic',
    followUp: ['HbA1c review'],
  },

  prediabetes: {
    key: 'prediabetes',
    specialty: 'Internal Medicine',
    label: 'Intermediate hyperglycaemia (ICD-11 5A40)',
    reasons: { initial: ['Annual check-up', 'Routine health check'], followUp: ['Follow-up of fasting sugar', 'Review of lifestyle changes'] },
    soap: {
      s: {
        initial: ['{first} attends for an annual check. Sedentary desk job. Father has type 2 diabetes. No polyuria or weight loss.'],
        followUp: ['{first} started walking 4 times a week and cut sugary drinks.'],
        improving: ['Lost weight gradually; feels more energetic.'],
        closing: ['Maintaining lifestyle changes.'],
      },
      o: same(['Home readings reviewed: fasting glucose {sugarText}. {bpText}. {weightText}']),
      a: {
        initial: ['Borderline fasting glucose; intermediate hyperglycaemia to be confirmed with HbA1c.'],
        followUp: ['HbA1c 5.9% confirms intermediate hyperglycaemia.'],
        improving: ['Improving with lifestyle measures.'],
        closing: ['Stable; no progression.'],
      },
      p: {
        initial: ['HbA1c and lipids. Lifestyle advice: 150 min/week activity, reduce refined sugar. Review with results.'],
        followUp: ['Lifestyle programme; no medication. Repeat HbA1c in 6 months.'],
        improving: ['Continue. Repeat HbA1c in 6 months.'],
        closing: ['Annual screening.'],
      },
    },
    regimen: [],
    labs: [{ test: 'HbA1c', reason: 'Borderline fasting glucose' }, { test: 'Lipid profile', reason: 'Annual check-up' }],
    vitals: ['sugar', 'weight', 'bp'],
    confirmsOnSecondVisit: true,
    journey: 'monitoring',
    followUp: ['Repeat HbA1c'],
  },

  iron_deficiency: {
    key: 'iron_deficiency',
    specialty: 'Internal Medicine',
    label: 'Iron deficiency anaemia (ICD-11 3A00)',
    reasons: { initial: ['Tiredness after giving birth'], followUp: ['Iron levels follow-up'] },
    soap: {
      s: {
        initial: ['{first} reports fatigue and breathlessness on stairs since delivery four months ago. Heavy blood loss at delivery.'],
        followUp: ['{first} taking {med}; mild constipation, energy improving.'],
        improving: ['Energy back to normal.'],
        closing: ['Well.'],
      },
      o: same(['Video review. Looks well, conjunctival pallor not assessable on video. {bpText}. {weightText}']),
      a: { initial: ['Probable postpartum iron deficiency anaemia; CBC and ferritin to confirm.'], followUp: ['Confirmed iron deficiency anaemia, responding to oral iron.'], improving: ['Improving.'], closing: ['Resolved.'] },
      p: {
        initial: ['CBC, ferritin. Start {med} with vitamin C-rich drink. Review in 6 weeks.'],
        followUp: ['Continue iron for 3 months after normalisation.'],
        improving: ['Repeat CBC in 3 months.'],
        closing: ['Discharged.'],
      },
    },
    regimen: [[{ name: 'Ferrous sulfate', dosage: '200 mg tablet', frequency: 'Once daily', durationDays: 90, instructions: 'Take on an empty stomach with orange juice; not with tea.' }]],
    labs: [{ test: 'Complete blood count (CBC)', reason: 'Fatigue after delivery' }, { test: 'Serum ferritin', reason: 'Suspected iron deficiency' }],
    vitals: ['bp', 'weight'],
    journey: 'resolved',
    followUp: ['Repeat CBC'],
  },

  asthma: {
    key: 'asthma',
    specialty: 'Internal Medicine',
    label: 'Asthma (ICD-11 CA23)',
    reasons: { initial: ['Asthma review', 'More wheezing at night'], followUp: ['Asthma control follow-up'] },
    soap: {
      s: {
        initial: ['{first} has had asthma since childhood. Using reliever 4-5 times a week and waking at night twice weekly this season. Avoids aspirin and ibuprofen (previous wheeze).'],
        followUp: ['Night symptoms resolved on {med}. Reliever use once a week.'],
        improving: ['Well controlled; no night waking.'],
        closing: ['Controlled.'],
      },
      o: same(['Speaking in full sentences, no audible wheeze on video. {weightText}']),
      a: { initial: ['Partly controlled asthma; step-up indicated.'], followUp: ['Good control on maintenance and reliever therapy.'], improving: ['Controlled.'], closing: ['Controlled.'] },
      p: {
        initial: ['Start {med}. Inhaler technique checked on video. Written asthma action plan. Review in 6 weeks.'],
        followUp: ['Continue {med}. Review in 3 months.'],
        improving: ['Continue. Annual flu vaccine advised.'],
        closing: ['Routine review.'],
      },
    },
    regimen: [[{ name: 'Budesonide/formoterol inhaler', dosage: '160/4.5 mcg', frequency: 'One puff twice daily and as needed', durationDays: 90, instructions: 'Rinse mouth after use.' }]],
    vitals: ['weight'],
    journey: 'ongoing_chronic',
    followUp: ['Asthma control review'],
  },

  gerd: {
    key: 'gerd',
    specialty: 'Internal Medicine',
    label: 'Gastro-oesophageal reflux disease (ICD-11 DA22)',
    reasons: { initial: ['Heartburn after meals'], followUp: ['Heartburn follow-up'] },
    soap: {
      s: {
        initial: ['{first} has burning chest discomfort after heavy evening meals for two months, worse lying down. No weight loss, no difficulty swallowing.'],
        followUp: ['Symptoms settled on {med}; eating earlier in the evening.'],
        improving: ['Symptom-free.'],
        closing: ['Symptom-free off medication.'],
      },
      o: same(['Video review, comfortable. {weightText}']),
      a: { initial: ['Typical GERD without alarm features.'], followUp: ['Responding to PPI.'], improving: ['Resolved.'], closing: ['Resolved.'] },
      p: {
        initial: ['Start {med} for 4 weeks; avoid late meals; raise head of bed. Review in 4 weeks.'],
        followUp: ['Step down to as-needed use.'],
        improving: ['Stop PPI.'],
        closing: ['Discharged.'],
      },
    },
    regimen: [[{ name: 'Omeprazole', dosage: '20 mg capsule', frequency: 'Once daily before breakfast', durationDays: 28 }], []],
    vitals: ['weight'],
    journey: 'resolved',
    followUp: ['Heartburn review'],
  },

  hypothyroidism: {
    key: 'hypothyroidism',
    specialty: 'Internal Medicine',
    label: 'Hypothyroidism (ICD-11 5A00)',
    reasons: { initial: ['Tiredness and weight gain'], followUp: ['Thyroid follow-up'] },
    soap: {
      s: {
        initial: ['{first} reports tiredness, feeling cold and gradual weight gain over six months.'],
        followUp: ['Feeling more energetic on {med}.'],
        improving: ['Back to normal energy.'],
        closing: ['Stable.'],
      },
      o: same(['Video review. {bpText}. {weightText}']),
      a: { initial: ['Probable primary hypothyroidism; TSH to confirm.'], followUp: ['Hypothyroidism confirmed (TSH raised), responding to replacement.'], improving: ['Euthyroid on treatment.'], closing: ['Stable.'] },
      p: {
        initial: ['TSH and free T4. Start {med} if confirmed. Review with results.'],
        followUp: ['Continue {med}. Recheck TSH in 6 weeks.'],
        improving: ['Continue. TSH every 6 months.'],
        closing: ['Annual TSH.'],
      },
    },
    regimen: [[], [{ name: 'Levothyroxine', dosage: '50 mcg tablet', frequency: 'Once daily before breakfast', durationDays: 60, instructions: 'Take 30 minutes before food or other medicines.' }]],
    labs: [{ test: 'Thyroid function (TSH, free T4)', reason: 'Fatigue and weight gain' }],
    vitals: ['weight', 'bp'],
    confirmsOnSecondVisit: true,
    journey: 'ongoing_chronic',
    followUp: ['TSH recheck'],
  },

  vitamin_d: {
    key: 'vitamin_d',
    specialty: 'Internal Medicine',
    label: 'Vitamin D deficiency (ICD-11 5B57)',
    reasons: { initial: ['Low vitamin D on blood test'], followUp: ['Vitamin D follow-up'] },
    soap: {
      s: same(['{first} had vitamin D of 12 ng/mL on a recent test. Mostly indoors, little sun exposure.']),
      o: same(['Video review. {weightText}']),
      a: same(['Vitamin D deficiency.']),
      p: same(['Start {med}; recheck level in 3 months.']),
    },
    regimen: [[{ name: 'Cholecalciferol (vitamin D3)', dosage: '50,000 IU capsule', frequency: 'Once weekly', durationDays: 56 }]],
    vitals: ['weight'],
    journey: 'resolved',
  },

  // -------------------------------------------------------------------------
  // Dermatology
  // -------------------------------------------------------------------------
  acne: {
    key: 'acne',
    specialty: 'Dermatology',
    label: 'Acne vulgaris (ICD-11 ED80)',
    reasons: { initial: ['Breakouts on face and back'], followUp: ['Acne treatment review'] },
    soap: {
      s: {
        initial: ['{first} has had inflammatory spots on the face and upper back for a year, worse before exams. Over-the-counter washes did not help.'],
        followUp: ['{first} uses the gel nightly; initial dryness settled. Fewer new spots.'],
        improving: ['Skin much clearer; occasional single spots.'],
        closing: ['Clear on maintenance.'],
      },
      o: same(['Photos reviewed on video in good light: {skinFinding}.']),
      a: { initial: ['Moderate inflammatory acne, no scarring.'], followUp: ['Improving.'], improving: ['Mild residual acne.'], closing: ['Controlled.'] },
      p: {
        initial: ['Start {med}. Non-comedogenic moisturiser and sunscreen. Review in 8 weeks.'],
        followUp: ['{change} Review in 8 weeks.'],
        improving: ['Maintenance topical only.'],
        closing: ['Continue maintenance.'],
      },
    },
    regimen: [
      [
        { name: 'Adapalene/benzoyl peroxide 0.1%/2.5% gel', dosage: 'Thin layer', frequency: 'Once nightly', durationDays: 84, instructions: 'Apply to the whole area, not single spots. May bleach fabrics.' },
        { name: 'Doxycycline', dosage: '100 mg capsule', frequency: 'Once daily with food', durationDays: 56, instructions: 'Take with a full glass of water; avoid strong sun.' },
      ],
      [{ name: 'Adapalene/benzoyl peroxide 0.1%/2.5% gel', dosage: 'Thin layer', frequency: 'Once nightly', durationDays: 84 }],
    ],
    vitals: [],
    journey: 'monitoring',
    followUp: ['Acne review'],
  },

  eczema: {
    key: 'eczema',
    specialty: 'Dermatology',
    label: 'Atopic eczema (ICD-11 EA80)',
    reasons: { initial: ['Itchy dry patches on hands and elbows'], followUp: ['Eczema follow-up'] },
    soap: {
      s: {
        initial: ['{first} has itchy, dry patches on the hands and inner elbows, worse in winter and with frequent hand-washing. Childhood eczema.'],
        followUp: ['Flare settled with the steroid cream; using emollient several times a day.'],
        improving: ['Skin calm.'],
        closing: ['Well controlled.'],
      },
      o: same(['Photos reviewed on video: {skinFinding}.']),
      a: { initial: ['Atopic eczema flare, mild-to-moderate.'], followUp: ['Responding.'], improving: ['Controlled.'], closing: ['Controlled.'] },
      p: {
        initial: ['{med}. Soap substitute, gloves for wet work. Review in 4 weeks.'],
        followUp: ['Weekend-only steroid for maintenance; continue emollient.'],
        improving: ['Emollient only.'],
        closing: ['As needed.'],
      },
    },
    regimen: [[
      { name: 'Mometasone furoate 0.1% cream', dosage: 'Thin layer', frequency: 'Once daily to flare areas', durationDays: 14, instructions: 'Do not use on the face.' },
      { name: 'Emollient cream', dosage: 'Generous amount', frequency: 'At least three times daily', durationDays: 90 },
    ]],
    vitals: [],
    journey: 'monitoring',
    followUp: ['Eczema review'],
  },

  hair_loss: {
    key: 'hair_loss',
    specialty: 'Dermatology',
    label: 'Alopecia areata (ICD-11 ED70.2)',
    reasons: { initial: ['Round patches of hair loss'], followUp: ['Hair loss follow-up'] },
    soap: {
      s: {
        initial: ['{first} noticed two coin-sized bald patches on the scalp over a month, after a stressful period. No scaling or itch.'],
        followUp: ['Fine regrowth seen at the edges of both patches.'],
        improving: ['Patches mostly regrown.'],
        closing: ['Full regrowth.'],
      },
      o: same(['Photos reviewed: {skinFinding}.']),
      a: { initial: ['Patchy alopecia areata, limited extent.'], followUp: ['Early regrowth.'], improving: ['Regrowing.'], closing: ['Resolved.'] },
      p: {
        initial: ['{med}. Reassurance; good prognosis for limited disease. Thyroid and iron tests. Review in 8 weeks.'],
        followUp: ['Continue. Review in 8 weeks.'],
        improving: ['Stop treatment when fully regrown.'],
        closing: ['Discharged.'],
      },
    },
    regimen: [[{ name: 'Clobetasol propionate 0.05% scalp solution', dosage: 'A few drops', frequency: 'Once daily to patches', durationDays: 42 }]],
    labs: [{ test: 'Thyroid function (TSH, free T4)', reason: 'Associated autoimmune screen' }, { test: 'Serum ferritin', reason: 'Hair loss work-up' }],
    vitals: [],
    journey: 'resolved',
    followUp: ['Regrowth review'],
  },

  seb_derm: {
    key: 'seb_derm',
    specialty: 'Dermatology',
    label: 'Seborrhoeic dermatitis',
    reasons: { initial: ['Flaky red skin around nose and eyebrows'], followUp: ['Skin follow-up'] },
    soap: {
      s: same(['{first} has flaky, mildly itchy redness beside the nose and in the eyebrows, worse with stress and winter.']),
      o: same(['Photos reviewed: {skinFinding}.']),
      a: same(['Seborrhoeic dermatitis, mild.']),
      p: same(['{med}. Review only if not settling in 4 weeks.']),
    },
    regimen: [[{ name: 'Ketoconazole 2% cream', dosage: 'Thin layer', frequency: 'Twice daily', durationDays: 28 }]],
    vitals: [],
    journey: 'resolved',
  },

  // -------------------------------------------------------------------------
  // ENT
  // -------------------------------------------------------------------------
  allergic_rhinitis: {
    key: 'allergic_rhinitis',
    specialty: 'Otolaryngology (ENT)',
    label: 'Allergic rhinitis (ICD-11 CA08.0)',
    reasons: { initial: ['Sneezing and blocked nose every spring', 'Constant runny nose and itchy eyes'], followUp: ['Rhinitis follow-up'] },
    soap: {
      s: {
        initial: ['{first} has sneezing, clear runny nose and nasal blockage each spring and when dusting at home. Sleep disturbed by blockage. No nosebleeds.'],
        followUp: ['Much better on the nasal spray; using it daily during the season.'],
        improving: ['Symptoms minimal this season.'],
        closing: ['Controlled.'],
      },
      o: same(['Video examination: {entFinding}.']),
      a: { initial: ['Seasonal allergic rhinitis, moderate.'], followUp: ['Good response to intranasal steroid.'], improving: ['Controlled.'], closing: ['Controlled.'] },
      p: {
        initial: ['{med}. Correct spray technique demonstrated. Allergen avoidance advice. Review in 6 weeks.'],
        followUp: ['Continue during the pollen season.'],
        improving: ['Restart the spray two weeks before next season.'],
        closing: ['As needed.'],
      },
    },
    regimen: [[
      { name: 'Fluticasone propionate nasal spray', dosage: '50 mcg per spray, two sprays each nostril', frequency: 'Once daily', durationDays: 60, instructions: 'Aim away from the nasal septum.' },
      { name: 'Cetirizine', dosage: '10 mg tablet', frequency: 'Once daily at night', durationDays: 30 },
    ]],
    labs: [{ test: 'Total serum IgE', reason: 'Allergic rhinitis work-up' }],
    vitals: [],
    journey: 'monitoring',
    followUp: ['Rhinitis review'],
  },

  sinusitis: {
    key: 'sinusitis',
    specialty: 'Otolaryngology (ENT)',
    label: 'Acute rhinosinusitis',
    reasons: { initial: ['Facial pain and thick nasal discharge for 10 days'], followUp: ['Sinusitis follow-up'] },
    soap: {
      s: {
        initial: ['{first} has had nasal blockage, thick yellow discharge and facial pressure for 10 days, worsening after initial improvement. Mild fever two days ago.'],
        followUp: ['Much improved; discharge clear, pressure gone.'],
        improving: ['Resolved.'],
        closing: ['Resolved.'],
      },
      o: same(['Video examination: {entFinding}.']),
      a: { initial: ['Acute bacterial rhinosinusitis (double worsening).'], followUp: ['Resolving.'], improving: ['Resolved.'], closing: ['Resolved.'] },
      p: {
        initial: ['{med}. Saline irrigation. Seek review if eye swelling or severe headache.'],
        followUp: ['Complete the course.'],
        improving: ['Discharged.'],
        closing: ['Discharged.'],
      },
    },
    regimen: [[
      { name: 'Amoxicillin/clavulanate', dosage: '875/125 mg tablet', frequency: 'Twice daily', durationDays: 7, instructions: 'Take at the start of a meal.', allergyClass: 'penicillin' },
      { name: 'Sodium chloride nasal irrigation', dosage: '240 mL rinse', frequency: 'Twice daily', durationDays: 10 },
    ]],
    alternatives: {
      penicillin: [
        { name: 'Clarithromycin', dosage: '500 mg tablet', frequency: 'Twice daily', durationDays: 7, instructions: 'Penicillin allergy: macrolide used instead.', allergyClass: 'macrolide' },
        { name: 'Sodium chloride nasal irrigation', dosage: '240 mL rinse', frequency: 'Twice daily', durationDays: 10 },
      ],
    },
    vitals: [],
    journey: 'resolved',
    followUp: ['Check resolution'],
  },

  otitis_media: {
    key: 'otitis_media',
    specialty: 'Otolaryngology (ENT)',
    label: 'Acute otitis media (ICD-11 AB00)',
    reasons: { initial: ['Ear pain after a cold'], followUp: ['Ear follow-up'] },
    soap: {
      s: same(['{first} developed left ear pain and muffled hearing three days after a cold. No discharge.']),
      o: same(['Video examination with phone otoscope image: {entFinding}.']),
      a: same(['Acute otitis media, left.']),
      p: same(['{med}. Analgesia. Review if not improving in 72 hours.']),
    },
    regimen: [[{ name: 'Paracetamol', dosage: '1 g (two 500 mg tablets)', frequency: 'Up to four times daily when needed', durationDays: 5, instructions: 'No more than 4 g in 24 hours.' }]],
    vitals: [],
    journey: 'resolved',
  },

  // -------------------------------------------------------------------------
  // Orthopedics
  // -------------------------------------------------------------------------
  low_back_pain: {
    key: 'low_back_pain',
    specialty: 'Orthopedics',
    label: 'Low back pain (ICD-11 ME84.2)',
    reasons: { initial: ['Lower back pain after lifting'], followUp: ['Back pain follow-up', 'Physiotherapy progress review'] },
    soap: {
      s: {
        initial: ['{first} developed lower back pain after lifting boxes two weeks ago. No leg numbness, no bladder or bowel change. Desk work aggravates it.'],
        followUp: ['Pain eased with physiotherapy exercises; still stiff in the mornings.'],
        improving: ['Back to normal activity with occasional stiffness.'],
        closing: ['Pain-free.'],
      },
      o: same(['Video assessment: {orthoFinding}. {weightText}']),
      a: { initial: ['Mechanical low back pain, no red flags.'], followUp: ['Improving.'], improving: ['Near resolution.'], closing: ['Resolved.'] },
      p: {
        initial: ['{med}. Stay active; physiotherapy core programme. Review in 3 weeks.'],
        followUp: ['Continue exercises; ergonomic desk set-up.'],
        improving: ['Self-managed exercise.'],
        closing: ['Discharged.'],
      },
    },
    regimen: [[{ name: 'Ibuprofen', dosage: '400 mg tablet', frequency: 'Three times daily with food', durationDays: 7, allergyClass: 'nsaid' }], []],
    alternatives: {
      nsaid: [{ name: 'Paracetamol', dosage: '1 g (two 500 mg tablets)', frequency: 'Up to four times daily', durationDays: 7, instructions: 'NSAID allergy: paracetamol used instead.' }],
    },
    vitals: ['weight'],
    journey: 'resolved',
    followUp: ['Back pain review'],
  },

  knee_oa: {
    key: 'knee_oa',
    specialty: 'Orthopedics',
    label: 'Osteoarthritis of knee (ICD-11 FA01)',
    reasons: { initial: ['Knee pain on stairs'], followUp: ['Knee follow-up', 'Knee X-ray results'] },
    soap: {
      s: {
        initial: ['{first} has right knee pain on stairs and after walking for over 20 minutes for a year; morning stiffness under 30 minutes.'],
        followUp: ['X-ray done. Strengthening exercises helping; pain lower.'],
        improving: ['Walking 30 minutes comfortably.'],
        closing: ['Manageable with exercise.'],
      },
      o: same(['Video assessment: {orthoFinding}. {weightText}']),
      a: { initial: ['Clinical knee osteoarthritis.'], followUp: ['X-ray shows medial joint-space narrowing, consistent with OA.'], improving: ['Improving function.'], closing: ['Stable.'] },
      p: {
        initial: ['Knee X-ray. Quadriceps strengthening; weight management. {med}. Review with X-ray.'],
        followUp: ['Continue physiotherapy; topical gel when needed.'],
        improving: ['Continue.'],
        closing: ['Review in 6 months.'],
      },
    },
    regimen: [
      [{ name: 'Diclofenac 1% gel', dosage: 'Apply 4 g', frequency: 'Up to three times daily to the knee', durationDays: 30, allergyClass: 'nsaid' }],
      [{ name: 'Paracetamol', dosage: '1 g (two 500 mg tablets)', frequency: 'Up to three times daily when needed', durationDays: 30 }],
    ],
    alternatives: { nsaid: [{ name: 'Paracetamol', dosage: '1 g (two 500 mg tablets)', frequency: 'Up to three times daily when needed', durationDays: 30 }] },
    vitals: ['weight'],
    journey: 'ongoing_chronic',
    followUp: ['Knee function review'],
  },

  ankle_sprain: {
    key: 'ankle_sprain',
    specialty: 'Orthopedics',
    label: 'Ankle sprain, lateral ligament',
    reasons: { initial: ['Twisted ankle playing football'], followUp: ['Ankle follow-up'] },
    soap: {
      s: {
        initial: ['{first} inverted the right ankle playing football two days ago; able to walk with pain. Swelling over the outer ankle.'],
        followUp: ['Swelling down; walking normally, mild pain on running.'],
        improving: ['Back to training.'],
        closing: ['Recovered.'],
      },
      o: same(['Video assessment: {orthoFinding}.']),
      a: { initial: ['Lateral ankle sprain, grade 1-2. Ottawa rules: no X-ray needed.'], followUp: ['Recovering.'], improving: ['Recovered.'], closing: ['Recovered.'] },
      p: {
        initial: ['Rest, ice, compression, elevation. {med}. Balance exercises from day 5. Review in 2 weeks.'],
        followUp: ['Progressive return to sport.'],
        improving: ['Discharged.'],
        closing: ['Discharged.'],
      },
    },
    regimen: [[{ name: 'Ibuprofen', dosage: '400 mg tablet', frequency: 'Three times daily with food', durationDays: 5, allergyClass: 'nsaid' }]],
    alternatives: { nsaid: [{ name: 'Paracetamol', dosage: '1 g (two 500 mg tablets)', frequency: 'Up to four times daily', durationDays: 5 }] },
    vitals: [],
    journey: 'resolved',
    followUp: ['Return-to-sport review'],
  },

  neck_pain: {
    key: 'neck_pain',
    specialty: 'Orthopedics',
    label: 'Neck pain, postural',
    reasons: { initial: ['Neck and shoulder pain from long hours at the laptop'], followUp: ['Neck pain follow-up'] },
    soap: {
      s: same(['{first} has neck and upper shoulder ache by the end of the working day for two months. No arm numbness.']),
      o: same(['Video assessment: {orthoFinding}.']),
      a: same(['Postural neck pain, no neurological features.']),
      p: same(['Workstation set-up, hourly breaks, stretching programme. {med}.']),
    },
    regimen: [[{ name: 'Paracetamol', dosage: '1 g (two 500 mg tablets)', frequency: 'Up to three times daily when needed', durationDays: 10 }]],
    vitals: [],
    journey: 'resolved',
  },

  // -------------------------------------------------------------------------
  // Dentistry (teleconsultation: triage, advice, post-treatment follow-up)
  // -------------------------------------------------------------------------
  dental_checkup: {
    key: 'dental_checkup',
    specialty: 'Dentistry',
    label: 'Routine dental review: early enamel caries',
    reasons: { initial: ['Routine dental check-up', 'Sensitivity to cold drinks'], followUp: ['Follow-up after filling'] },
    soap: {
      s: {
        initial: ['{first} reports brief sensitivity to cold on the lower left side for a month. Brushes twice daily, rarely flosses.'],
        followUp: ['{first} had the filling done at the partner clinic; sensitivity gone.'],
        improving: ['No complaints.'],
        closing: ['No complaints.'],
      },
      o: same(['Intra-oral photos shared on video: {dentalFinding}.']),
      a: { initial: ['Early carious lesion lower left first molar; gingival inflammation from plaque.'], followUp: ['Restoration intact.'], improving: ['Healthy.'], closing: ['Healthy.'] },
      p: {
        initial: ['Referral for in-person restoration. Fluoride toothpaste, daily flossing. {med}. Review after treatment.'],
        followUp: ['Six-monthly check-ups.'],
        improving: ['Routine recall.'],
        closing: ['Routine recall.'],
      },
    },
    regimen: [[{ name: 'Chlorhexidine 0.12% mouthwash', dosage: '15 mL rinse', frequency: 'Twice daily after brushing', durationDays: 10, instructions: 'Do not eat or drink for 30 minutes after rinsing.' }], []],
    vitals: [],
    journey: 'resolved',
    followUp: ['Post-treatment check'],
  },

  dental_infection: {
    key: 'dental_infection',
    specialty: 'Dentistry',
    label: 'Dental abscess, lower right molar',
    reasons: { initial: ['Throbbing toothache and swollen gum'], followUp: ['Follow-up after root canal'] },
    soap: {
      s: {
        initial: ['{first} has throbbing pain in a lower right molar for three days and a tender gum swelling. No difficulty swallowing or breathing.'],
        followUp: ['Root canal started at the partner clinic; swelling resolved.'],
        improving: ['Comfortable.'],
        closing: ['Comfortable.'],
      },
      o: same(['Photos shared on video: {dentalFinding}.']),
      a: { initial: ['Localised periapical abscess, no spreading features.'], followUp: ['Resolved after drainage and antibiotics.'], improving: ['Healed.'], closing: ['Healed.'] },
      p: {
        initial: ['Urgent in-person drainage/root canal referral. {med}. Seek emergency care if swelling spreads.'],
        followUp: ['Complete root canal and crown.'],
        improving: ['Routine recall.'],
        closing: ['Routine recall.'],
      },
    },
    regimen: [[{ name: 'Amoxicillin', dosage: '500 mg capsule', frequency: 'Three times daily', durationDays: 5, allergyClass: 'penicillin' }]],
    alternatives: { penicillin: [{ name: 'Clindamycin', dosage: '300 mg capsule', frequency: 'Four times daily', durationDays: 5, instructions: 'Penicillin allergy: clindamycin used instead.' }] },
    vitals: [],
    journey: 'resolved',
    followUp: ['Post root-canal review'],
  },

  // -------------------------------------------------------------------------
  // Ophthalmology
  // -------------------------------------------------------------------------
  diabetic_eye_screen: {
    key: 'diabetic_eye_screen',
    specialty: 'Ophthalmology',
    label: 'Diabetic eye screening',
    reasons: { initial: ['Annual diabetic eye screening'], followUp: ['Retinal photo results'] },
    soap: {
      s: {
        initial: ['{first} has type 2 diabetes for 5 years and is due for retinal screening. No visual symptoms.'],
        followUp: ['Retinal photographs taken at the partner imaging centre.'],
        improving: ['No visual symptoms.'],
        closing: ['No visual symptoms.'],
      },
      o: same(['Visual acuity self-test on screen: 6/6 both eyes. Fundus photographs reviewed when available.']),
      a: { initial: ['Screening due.'], followUp: ['No diabetic retinopathy on fundus photographs.'], improving: ['No retinopathy.'], closing: ['No retinopathy.'] },
      p: {
        initial: ['Dilated fundus photography at partner centre. Keep glucose and BP controlled.'],
        followUp: ['Annual screening.'],
        improving: ['Annual screening.'],
        closing: ['Annual screening.'],
      },
    },
    regimen: [],
    vitals: ['bp', 'sugar'],
    journey: 'monitoring',
    followUp: ['Annual retinal screening'],
    ruledOut: { label: 'Diabetic retinopathy (ICD-11 9B71.0)', afterLab: 'normal fundus photographs' },
  },

  myopia: {
    key: 'myopia',
    specialty: 'Ophthalmology',
    label: 'Myopia (ICD-11 9D00.0)',
    reasons: { initial: ['Blurry distance vision', 'Eye strain from studying'], followUp: ['Glasses follow-up'] },
    soap: {
      s: {
        initial: ['{first} finds the board and road signs blurry and gets headaches after long reading sessions.'],
        followUp: ['New glasses from the optician; headaches resolved.'],
        improving: ['Comfortable.'],
        closing: ['Comfortable.'],
      },
      o: same(['Screen-based acuity check: reduced distance acuity, near acuity normal.']),
      a: { initial: ['Probable myopia; refraction needed.'], followUp: ['Myopia corrected with glasses.'], improving: ['Corrected.'], closing: ['Corrected.'] },
      p: {
        initial: ['Refraction at partner optician. 20-20-20 rule for screen work. {med}.'],
        followUp: ['Annual eye check.'],
        improving: ['Annual eye check.'],
        closing: ['Annual eye check.'],
      },
    },
    regimen: [[{ name: 'Carboxymethylcellulose 0.5% eye drops', dosage: '1 drop each eye', frequency: 'Up to four times daily', durationDays: 30 }], []],
    vitals: [],
    confirmsOnSecondVisit: true,
    journey: 'resolved',
    followUp: ['Glasses check'],
  },

  allergic_conjunctivitis: {
    key: 'allergic_conjunctivitis',
    specialty: 'Ophthalmology',
    label: 'Allergic conjunctivitis',
    reasons: { initial: ['Itchy, watery red eyes'], followUp: ['Eye allergy follow-up'] },
    soap: {
      s: same(['{first} has itchy, watery, red eyes in spring, together with sneezing. No pain or reduced vision.']),
      o: same(['Video examination: bilateral mild conjunctival redness, no discharge, cornea clear on camera.']),
      a: same(['Seasonal allergic conjunctivitis.']),
      p: same(['{med}. Cold compresses; avoid rubbing. Review if pain or vision change.']),
    },
    regimen: [[{ name: 'Olopatadine 0.1% eye drops', dosage: '1 drop each eye', frequency: 'Twice daily', durationDays: 30 }]],
    vitals: [],
    journey: 'resolved',
  },

  dry_eye: {
    key: 'dry_eye',
    specialty: 'Ophthalmology',
    label: 'Dry eye from prolonged screen use',
    reasons: { initial: ['Burning eyes at the end of the day'], followUp: ['Dry eye follow-up'] },
    soap: {
      s: same(['{first} has gritty, burning eyes after long hours on screens, better at weekends.']),
      o: same(['Video examination: mild redness, normal eyelids.']),
      a: same(['Evaporative dry eye related to screen use.']),
      p: same(['{med}. 20-20-20 rule, blink breaks, humidifier.']),
    },
    regimen: [[{ name: 'Carboxymethylcellulose 0.5% eye drops', dosage: '1 drop each eye', frequency: 'Four times daily', durationDays: 30 }]],
    vitals: [],
    journey: 'resolved',
  },
};

// ---------------------------------------------------------------------------
// Pediatrics -- parent guidance consultations
// ---------------------------------------------------------------------------
// Every demo patient is an adult and the platform has no dependant/guardian
// model (GuardianLink is explicitly out of scope in the schema), so a
// paediatrician's demo consultations are parents asking about their child.
// They are recorded as notes only: no diagnosis, prescription or vitals is
// written onto the PARENT's own health record.
export interface PediatricTopic {
  reason: string;
  s: string;
  a: string;
  p: string;
}

export const PEDIATRIC_TOPICS: readonly PediatricTopic[] = [
  {
    reason: 'Advice about my baby\'s sleep',
    s: '{first} asks about their {age} baby waking every two hours at night. Feeding well, gaining weight on the clinic chart, no fever.',
    a: 'Normal infant sleep pattern for age; no concerning features reported.',
    p: 'Discussed a consistent bedtime routine and safe-sleep advice. Routine vaccinations up to date. In-person review if fever or poor feeding.',
  },
  {
    reason: 'My toddler has a fever',
    s: '{first} reports their {age} child has had a temperature of 38.4 C for one day with a runny nose, drinking well, playful between fevers.',
    a: 'Probable viral upper respiratory infection; no red-flag features reported.',
    p: 'Fluids, fever control by weight-based dosing as discussed, warning signs explained (breathing difficulty, rash, drowsiness). In-person assessment if fever beyond 3 days.',
  },
  {
    reason: 'Picky eating and weight gain',
    s: '{first} is worried their {age} child refuses vegetables and eats small portions. Growth chart shared on screen tracks along the 50th centile.',
    a: 'Normal growth; age-typical food selectivity.',
    p: 'Repeated low-pressure exposure to new foods, family meals, limit juice. Recheck growth at the next routine visit.',
  },
  {
    reason: 'Vaccination schedule question',
    s: '{first} asks which vaccines are due for their {age} child and whether a mild cold is a reason to delay.',
    a: 'Vaccinations can proceed with a mild illness.',
    p: 'Reviewed the national schedule; book the due vaccines at the health office. Paracetamol for post-vaccine discomfort if needed.',
  },
  {
    reason: 'Rash on my child\'s cheeks',
    s: '{first} shares photos of dry, rough patches on their {age} child\'s cheeks, itchy at night. No fever.',
    a: 'Appearance consistent with mild childhood eczema.',
    p: 'Fragrance-free emollient several times a day, lukewarm baths. In-person review if weeping or infected-looking.',
  },
  {
    reason: 'Bedwetting',
    s: '{first} reports their {age} child still wets the bed most nights; dry during the day, no pain passing urine.',
    a: 'Primary nocturnal enuresis, common at this age.',
    p: 'Reassurance, no punishment, limit drinks before bed, toilet before sleep. Review in 3 months if not improving.',
  },
];

export const CHILD_AGES = ['6-month-old', '9-month-old', '18-month-old', '2-year-old', '3-year-old', '5-year-old', '6-year-old'];

// ---------------------------------------------------------------------------
// Examination findings by specialty (filled into the O section)
// ---------------------------------------------------------------------------
export const FINDINGS = {
  skin: [
    'scattered inflammatory papules and a few pustules on cheeks and forehead, no nodules or scars',
    'dry, slightly thickened patches on the dorsal hands and antecubital fossae, no weeping',
    'two well-defined round patches of non-scarring hair loss with exclamation-mark hairs at the margin',
    'fine greasy scale with mild erythema at the nasolabial folds and eyebrows',
  ],
  ent: [
    'pale, swollen nasal mucosa on phone-torch view, clear discharge, no polyps visible',
    'mucopurulent discharge, tenderness over the maxillary sinuses on self-palpation',
    'red, bulging left tympanic membrane on the shared otoscope image',
  ],
  ortho: [
    'guarded lumbar flexion, no neurological signs reported on guided self-testing',
    'mild effusion and crepitus of the right knee on guided movement, full extension',
    'swelling below the lateral malleolus, weight-bearing four steps',
    'reduced neck rotation to the right with trapezius tenderness on self-palpation',
  ],
  dental: [
    'small shadow on the occlusal surface of the lower left first molar, mild gingival redness',
    'gingival swelling adjacent to the lower right first molar, no facial swelling',
    'well-adapted restoration, healthy gingiva',
  ],
} as const;

/** Specialties whose doctors record each vital at a video visit (readings shared from home devices). */
export function vitalsForVisit(condition: ConditionSpec | undefined): readonly VitalKind[] {
  return condition?.vitals ?? [];
}

export function conditionsForSpecialty(specialty: Specialty): ConditionSpec[] {
  return Object.values(CONDITIONS).filter((condition) => condition.specialty === specialty);
}

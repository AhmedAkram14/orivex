/**
 * Demo timeline -- clinical text and vitals.
 *
 * SOAP sections are composed from the condition's phase fragments and filled
 * with the encounter's own numbers (scores that improve visit by visit, the
 * vitals actually recorded at that visit, the medication actually prescribed).
 * `content` is derived exactly the way ClinicalNote.record() derives it, so
 * every consumer that only reads `content` sees the same text.
 */
import type { ConditionSpec, Medication, Phase, VitalKind } from '../catalog/clinical.js';
import { CHILD_AGES, FINDINGS, PEDIATRIC_TOPICS } from '../catalog/clinical.js';
import type { Rng } from '../core.js';

// ---------------------------------------------------------------------------
// Vitals trajectories
// ---------------------------------------------------------------------------
/** Start/end values a patient drifts between across the ~9-month window (linear + small deterministic noise). */
export interface VitalsProfile {
  weight: [number, number];
  systolic: [number, number];
  diastolic: [number, number];
  /** Fasting blood sugar, mg/dL. */
  sugar: [number, number];
}

const DEFAULT_PROFILE = (gender: 'male' | 'female'): VitalsProfile =>
  gender === 'male'
    ? { weight: [82, 80.5], systolic: [122, 119], diastolic: [79, 77], sugar: [92, 90] }
    : { weight: [66, 65], systolic: [114, 112], diastolic: [74, 72], sugar: [88, 87] };

export const VITALS_PROFILES: Record<string, Partial<VitalsProfile>> = {
  // Borderline glucose and BP, improving with walking and less sugar.
  patient03: { weight: [86.4, 81.9], systolic: [136, 126], diastolic: [87, 80], sugar: [109, 100] },
  patient01: { weight: [79, 77.8] },
  patient02: { weight: [88, 86.2] },
  patient04: { weight: [58, 57.4] },
  // Postpartum weight returning slowly.
  patient05: { weight: [74, 68.5], systolic: [116, 112] },
  // Diabetic, improving control.
  patient06: { weight: [81, 77.6], systolic: [138, 128], diastolic: [86, 80], sugar: [162, 124] },
  patient07: { weight: [55, 55.5] },
  // Treated hypertension.
  patient08: { weight: [91, 88.4], systolic: [154, 131], diastolic: [97, 82], sugar: [98, 96] },
  patient09: { weight: [69, 68] },
  patient10: { weight: [93, 90.1] },
  patient11: { weight: [76, 76.5] },
  patient12: { weight: [61, 62.2] },
  patient13: { weight: [84, 83] },
  patient14: { weight: [57, 57.2] },
  patient15: { weight: [95, 92.7], systolic: [128, 124], diastolic: [82, 80] },
  patient16: { weight: [64, 63.4] },
  patient17: { weight: [72, 72.5] },
  // Hypothyroid weight gain reversing after treatment.
  patient18: { weight: [76, 73.1] },
  patient19: { weight: [70, 71.6] },
  patient20: { weight: [52, 52.6] },
};

export function vitalsProfileFor(patientKey: string, gender: 'male' | 'female'): VitalsProfile {
  return { ...DEFAULT_PROFILE(gender), ...VITALS_PROFILES[patientKey] };
}

const WINDOW_DAYS = 280;

/** Deterministic noise in [-1, 1] for a (patient, vital, day) triple. */
function noise(r: Rng): number {
  return r.next() * 2 - 1;
}

export interface VitalValues {
  weight?: number;
  systolic?: number;
  diastolic?: number;
  sugar?: number;
}

/** progress: 0 at the start of the window (~280 days ago), 1 at the anchor. */
export function vitalsAt(profile: VitalsProfile, daysBeforeAnchor: number, kinds: readonly VitalKind[], r: Rng): VitalValues {
  const progress = Math.min(1, Math.max(0, 1 - daysBeforeAnchor / WINDOW_DAYS));
  const lerp = ([from, to]: [number, number]): number => from + (to - from) * progress;
  const values: VitalValues = {};
  if (kinds.includes('weight')) values.weight = Math.round((lerp(profile.weight) + noise(r) * 0.3) * 10) / 10;
  if (kinds.includes('bp')) {
    values.systolic = Math.round(lerp(profile.systolic) + noise(r) * 3);
    values.diastolic = Math.round(lerp(profile.diastolic) + noise(r) * 2);
  }
  if (kinds.includes('sugar')) values.sugar = Math.round(lerp(profile.sugar) + noise(r) * 3);
  return values;
}

// ---------------------------------------------------------------------------
// SOAP composition
// ---------------------------------------------------------------------------
export interface SoapContext {
  firstName: string;
  phase: Phase;
  /** 0-based visit index within the episode. */
  visitIndex: number;
  visitCount: number;
  medications: readonly Medication[];
  previousMedications: readonly Medication[];
  vitals: VitalValues;
  weeksOnTreatment: number;
  labTests: readonly string[];
}

export interface Soap {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  content: string;
}

function trend(from: number, to: number, ctx: SoapContext): number {
  const steps = Math.max(1, ctx.visitCount - 1);
  return Math.round(from + ((to - from) * Math.min(ctx.visitIndex, steps)) / steps);
}

function medLabel(meds: readonly Medication[]): string {
  if (meds.length === 0) return 'the current plan';
  return meds.map((med) => `${med.name} ${med.dosage.replace(/ \(.*\)$/, '').replace(/ tablet| capsule/, '')}`).join(' and ');
}

function changeSentence(ctx: SoapContext): string {
  const current = ctx.medications;
  const previous = ctx.previousMedications;
  if (current.length === 0) return previous.length > 0 ? `${previous[0].name} stopped as planned.` : 'No medication needed.';
  if (previous.length === 0) return `Started ${medLabel(current)}.`;
  const changed = current.find((med) => {
    const before = previous.find((prior) => prior.name === med.name);
    return !before || before.dosage !== med.dosage;
  });
  if (!changed) return `Continue ${medLabel(current)} unchanged.`;
  const before = previous.find((prior) => prior.name === changed.name);
  return before
    ? `${changed.name} adjusted from ${before.dosage.replace(/ \(.*\)$/, '')} to ${changed.dosage.replace(/ \(.*\)$/, '')}.`
    : `Added ${changed.name} ${changed.dosage.replace(/ \(.*\)$/, '')}.`;
}

function vitalsLine(vitals: VitalValues): string {
  const parts: string[] = [];
  if (vitals.weight !== undefined) parts.push(`Weight ${vitals.weight.toFixed(1)} kg`);
  if (vitals.systolic !== undefined) parts.push(`BP ${vitals.systolic}/${vitals.diastolic} mmHg`);
  if (vitals.sugar !== undefined) parts.push(`fasting glucose ${vitals.sugar} mg/dL`);
  return parts.length > 0 ? `${parts.join(', ')} (home devices, shared on screen).` : '';
}

function fill(template: string, ctx: SoapContext, r: Rng): string {
  const replacements: Record<string, () => string> = {
    first: () => ctx.firstName,
    med: () => medLabel(ctx.medications.length > 0 ? ctx.medications : ctx.previousMedications),
    weeks: () => String(Math.max(2, ctx.weeksOnTreatment)),
    phq: () => String(trend(14, 4, ctx)),
    gad: () => String(trend(13, 4, ctx)),
    ybocs: () => String(trend(25, 11, ctx)),
    epds: () => String(trend(16, 6, ctx)),
    vitalsLine: () => vitalsLine(ctx.vitals),
    bpText: () => (ctx.vitals.systolic !== undefined ? `average home BP ${ctx.vitals.systolic}/${ctx.vitals.diastolic} mmHg` : 'no BP log this time'),
    weightText: () => (ctx.vitals.weight !== undefined ? `Weight ${ctx.vitals.weight.toFixed(1)} kg.` : ''),
    sugarText: () => (ctx.vitals.sugar !== undefined ? `${ctx.vitals.sugar} mg/dL` : 'not recorded'),
    change: () => changeSentence(ctx),
    skinFinding: () => r.pick(FINDINGS.skin),
    entFinding: () => r.pick(FINDINGS.ent),
    orthoFinding: () => r.pick(FINDINGS.ortho),
    dentalFinding: () => r.pick(FINDINGS.dental),
    test: () => ctx.labTests[0] ?? 'blood test',
  };
  return template
    .replace(/\{(\w+)\}/g, (_, key: string) => (replacements[key] ? replacements[key]() : `{${key}}`))
    .replace(/\s{2,}/g, ' ')
    .replace(/ \./g, '.')
    .trim();
}

export function composeSoap(condition: ConditionSpec, ctx: SoapContext, r: Rng): Soap {
  const section = (fragments: Record<Phase, readonly string[]>): string => fill(r.pick(fragments[ctx.phase]), ctx, r);
  let plan = section(condition.soap.p);
  if (ctx.labTests.length > 0 && ctx.phase === 'initial' && !/bloods?|tests?|HbA1c|TSH|Holter|X-ray|profile|ferritin|CBC|IgE/i.test(plan)) {
    plan = `${plan} Requested: ${ctx.labTests.join(', ')}.`;
  }
  const soap = {
    subjective: section(condition.soap.s),
    objective: section(condition.soap.o),
    assessment: section(condition.soap.a),
    plan,
  };
  return { ...soap, content: `S: ${soap.subjective}\n\nO: ${soap.objective}\n\nA: ${soap.assessment}\n\nP: ${soap.plan}` };
}

/** Parent-guidance paediatric consultation: notes only (see PEDIATRIC_TOPICS). */
export function composePediatricSoap(firstName: string, visitIndex: number, r: Rng): Soap & { reason: string } {
  const topic = PEDIATRIC_TOPICS[(visitIndex + r.int(0, PEDIATRIC_TOPICS.length - 1)) % PEDIATRIC_TOPICS.length];
  const age = CHILD_AGES[Math.min(CHILD_AGES.length - 1, visitIndex + r.int(0, 3))];
  const subjective = topic.s.replace('{first}', firstName).replace('{age}', age);
  const objective = 'Parent-guidance video consultation; the child was seen briefly on camera, alert and interactive. No examination findings recorded on the parent\'s record.';
  const soap = { subjective, objective, assessment: topic.a, plan: topic.p };
  return {
    ...soap,
    reason: topic.reason,
    content: `S: ${soap.subjective}\n\nO: ${soap.objective}\n\nA: ${soap.assessment}\n\nP: ${soap.plan}`,
  };
}

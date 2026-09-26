// Patient Record Page P0 fix. Two hard constraints on everything here:
//
// 1. Non-diagnostic wording only -- "above typical range" / "below typical
//    range", never "high"/"low"/"hypertensive"/etc. The UI reports a
//    measurement; the doctor makes the diagnosis.
// 2. Every flag carries the numeric reference range it used, so the UI can
//    show it verbatim (in a tooltip) alongside a "general adult reference,
//    not a diagnosis" note -- never a bare color or label with no stated
//    basis.
//
// Weight has no reference function at all: there is no BMI/height field
// anywhere in this domain, and a single "normal weight" number without
// that context would be meaningless.
//
// Glucose is deliberately narrow (only <70 or >200 mg/dL, the two bands
// that are abnormal in *any* context) because VitalReading has no fasting/
// random/post-meal field. A reading of 140 mg/dL is unremarkable two hours
// after a meal and abnormal fasting -- flagging the whole 70-200 middle
// band against one generic range would produce both false alarms and false
// reassurance, so it is left unflagged. This is a named schema gap
// (VitalReading needs a meal-context field), not silently worked around.

// `label` is deliberately NOT included here -- it's user-facing copy, which
// belongs in i18n (t('vitalAboveRange')/t('vitalBelowRange')), never a
// hardcoded English string returned from a _lib helper. `range` is a raw
// numeric string (units, not prose) -- safe to display as-is in any locale,
// same as "120/80" itself.
export interface RangeFlag {
  direction: 'above' | 'below';
  range: string;
}

const BP_SYSTOLIC_RANGE: [number, number] = [90, 120];
const BP_DIASTOLIC_RANGE: [number, number] = [60, 80];
const BP_RANGE_LABEL = '90-120/60-80 mmHg';

export function flagBloodPressure(systolic: number, diastolic: number): RangeFlag | null {
  const [sysLow, sysHigh] = BP_SYSTOLIC_RANGE;
  const [diaLow, diaHigh] = BP_DIASTOLIC_RANGE;
  if (systolic > sysHigh || diastolic > diaHigh) {
    return { direction: 'above', range: BP_RANGE_LABEL };
  }
  if (systolic < sysLow || diastolic < diaLow) {
    return { direction: 'below', range: BP_RANGE_LABEL };
  }
  return null;
}

const GLUCOSE_LOW_THRESHOLD = 70;
const GLUCOSE_HIGH_THRESHOLD = 200;
const GLUCOSE_RANGE_LABEL = '70-200 mg/dL';

export function flagGlucose(value: number): RangeFlag | null {
  if (value > GLUCOSE_HIGH_THRESHOLD) {
    return { direction: 'above', range: GLUCOSE_RANGE_LABEL };
  }
  if (value < GLUCOSE_LOW_THRESHOLD) {
    return { direction: 'below', range: GLUCOSE_RANGE_LABEL };
  }
  return null;
}

/**
 * The shaded reference band a `VitalCard` draws behind its trend line, in the
 * same units as the plotted series (`VitalReading.value`). These are the SAME
 * general-adult thresholds `flagBloodPressure` / `flagGlucose` use above --
 * one source, so the band and the status chip can never disagree.
 *
 * CLINICAL REVIEW: the numbers are pre-existing product constants (introduced
 * with the doctor's Patient Record page), not new here. Blood pressure plots
 * systolic only (the band is its normal systolic range); weight has no band
 * (no height/BMI context anywhere in the domain); glucose shows only the
 * always-abnormal edges (no fasting/random field on `VitalReading`).
 */
export interface VitalReferenceBand {
  low: number;
  high: number;
  /** Unit-bearing text for the tooltip / legend, e.g. "90-120 mmHg (systolic)". */
  label: string;
}

export const VITAL_REFERENCE_BANDS: Partial<Record<'blood-pressure' | 'blood-sugar', VitalReferenceBand>> = {
  'blood-pressure': { low: BP_SYSTOLIC_RANGE[0], high: BP_SYSTOLIC_RANGE[1], label: '90-120 mmHg' },
  'blood-sugar': { low: GLUCOSE_LOW_THRESHOLD, high: GLUCOSE_HIGH_THRESHOLD, label: GLUCOSE_RANGE_LABEL },
};

export type VitalEvaluation = 'in_range' | 'above' | 'below';

/**
 * The chip a `VitalCard` shows for the latest reading: a measurement against a
 * stated range, never a diagnosis. Blood pressure is "in range" when neither
 * flag fires. Glucose is only ever flagged at its always-abnormal edges -- the
 * unflagged middle is deliberately NOT reported as "in range" (see the note at
 * the top of this file: no fasting/random context, so reassurance would be
 * as unsafe as an alarm). Weight has no reference at all.
 */
export function evaluateVital(
  type: 'weight' | 'blood-pressure' | 'blood-sugar',
  value: number,
  diastolicValue?: number,
): VitalEvaluation | null {
  if (type === 'blood-pressure') {
    if (diastolicValue === undefined) return null;
    const flag = flagBloodPressure(value, diastolicValue);
    return flag ? flag.direction : 'in_range';
  }
  if (type === 'blood-sugar') {
    return flagGlucose(value)?.direction ?? null;
  }
  return null;
}

/**
 * The single, versioned switchboard for what the UI may say about a vital.
 *
 * Status chips and shaded bands stay OFF until a clinician signs off on the
 * guideline ORIVEX follows (US 2025 AHA/ACC and European 2024 ESC disagree
 * about the same blood-pressure reading) and VitalReading records whether a
 * glucose value was fasting / after a meal / random. Until then the trend line
 * is shown on its own. To switch them on: set `statusLabelsEnabled`, fill in
 * `source`, and bump `version`.
 */
export const VITAL_RANGES = {
  version: 1,
  /** The guideline the constants above follow. Unset: they are legacy product constants, not yet reviewed. */
  source: null as string | null,
  statusLabelsEnabled: false,
} as const;

/** The band to draw for a vital, or undefined while status labels are off. */
export function vitalBandFor(type: 'weight' | 'blood-pressure' | 'blood-sugar'): VitalReferenceBand | undefined {
  if (!VITAL_RANGES.statusLabelsEnabled || type === 'weight') return undefined;
  return VITAL_REFERENCE_BANDS[type];
}

/** The status chip for a reading, or null while status labels are off. */
export function vitalStatusFor(
  type: 'weight' | 'blood-pressure' | 'blood-sugar',
  value: number,
  diastolicValue?: number,
): VitalEvaluation | null {
  return VITAL_RANGES.statusLabelsEnabled ? evaluateVital(type, value, diastolicValue) : null;
}

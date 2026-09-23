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

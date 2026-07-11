// Finite set for V1 (Arabic-first, per the platform's localization principle).
// Values are full readable words rather than locale codes for domain-layer
// clarity; mapping to ISO codes (e.g. "ar"/"en") for persistence/APIs is a
// future infrastructure-layer concern, not a domain one.
export enum Language {
  Arabic = 'Arabic',
  English = 'English',
}

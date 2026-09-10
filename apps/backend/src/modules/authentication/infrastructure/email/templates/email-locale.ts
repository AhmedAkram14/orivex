import { Language } from '../../../../identity/domain/enums/language.enum.js';

// I3 -- Notification email delivery. The domain layer already models a
// patient/doctor's language preference (Language.Arabic | Language.English,
// Account/UserProfile) -- this is the sole place that maps it to the two
// locale keys the email template layer understands, so no other file needs
// to know the domain enum exists.
export type EmailLocale = 'en' | 'ar';

export function toEmailLocale(language: Language | undefined): EmailLocale {
  return language === Language.Arabic ? 'ar' : 'en';
}

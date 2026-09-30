import { createFormatter, createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import type { NotificationEntry } from '@/features/notifications/api/types';
import enMessages from '../../../../messages/en.json';
import arMessages from '../../../../messages/ar.json';
import { localizeNotification } from './notification-copy';

const FSI = '⁨';
const PDI = '⁩';

function localize(locale: 'en' | 'ar', entry: Pick<NotificationEntry, 'title' | 'description'> & Partial<NotificationEntry>) {
  const messages = locale === 'en' ? enMessages : arMessages;
  const t = createTranslator({ locale, messages, namespace: 'notificationCopy' });
  const format = createFormatter({ locale, timeZone: 'Africa/Cairo' });
  return localizeNotification(
    { id: 'n', severity: 'info', createdAt: new Date().toISOString(), read: false, ...entry } as NotificationEntry,
    t as never,
    format,
  );
}

describe('localizeNotification: details carried in the backend body', () => {
  it('keeps the patient name, rating and comment of a review, each isolated like <bdi>', () => {
    const entry = { title: 'New consultation review', description: 'Youssef Hassan rated their consultation 4/5: "Very kind."' };
    expect(localize('en', entry)).toEqual({
      title: 'New consultation review',
      description: `${FSI}Youssef Hassan${PDI} rated the consultation 4/5: “${FSI}Very kind.${PDI}”`,
    });
    const ar = localize('ar', entry);
    expect(ar.title).toBe('تقييم جديد للاستشارة');
    // The Latin name sits isolated inside the Arabic sentence, and the sentence keeps its own ending.
    expect(ar.description).toContain(`${FSI}Youssef Hassan${PDI}`);
    expect(ar.description.startsWith('قيّم ')).toBe(true);
  });

  it('uses the named sentence without a comment, and for requests and check-ins', () => {
    expect(localize('ar', { title: 'New consultation review', description: 'Youssef Hassan rated their consultation 5/5.' }).description).toBe(
      `قيّم ${FSI}Youssef Hassan${PDI} الاستشارة بـ 5/5.`,
    );
    expect(
      localize('en', {
        title: 'New appointment request',
        description: 'Mona Farouk has requested an appointment. Approve it to add them to your queue.',
      }).description,
    ).toBe(`${FSI}Mona Farouk${PDI} requested an appointment with you.`);
    expect(localize('ar', { title: 'Patient checked in', description: 'Mona Farouk is now waiting in your queue.' }).description).toBe(
      `وصل ${FSI}Mona Farouk${PDI} وهو في الانتظار.`,
    );
  });

  it("keeps an admin's reason on a rejected or incomplete verification", () => {
    expect(
      localize('en', {
        title: 'Verification rejected',
        description: 'Your professional verification application was rejected. Reason: Licence photo is blurry.',
      }),
    ).toEqual({
      title: 'Verification rejected',
      description: `Your verification application was rejected. Reason: ${FSI}Licence photo is blurry.${PDI}`,
    });
    expect(localize('ar', { title: 'More information needed', description: 'Your identity verification application needs more information before it can be reviewed.' })).toEqual({
      title: 'مطلوب مزيد من المعلومات',
      description: 'يحتاج طلب التوثيق الخاص بك إلى مزيد من المعلومات قبل مراجعته.',
    });
  });

  it('falls back to the generic sentence when the wording is not the backend template (never guesses a name)', () => {
    expect(localize('en', { title: 'New consultation review', description: 'Someone left feedback.' }).description).toBe(
      'A patient left a review of a consultation.',
    );
  });
});

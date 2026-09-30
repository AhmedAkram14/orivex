import { describe, expect, it } from 'vitest';
import type { NotificationEntry } from '@/features/notifications/api/types';
import { groupConsecutiveActivity } from './activity-groups';

const HOUR = 60 * 60 * 1000;
const base = new Date('2026-09-30T12:00:00.000Z').getTime();

function entry(id: string, title: string, hoursAgo: number): NotificationEntry {
  return { id, title, description: '', severity: 'info', createdAt: new Date(base - hoursAgo * HOUR).toISOString(), read: true };
}

describe('groupConsecutiveActivity', () => {
  it('folds consecutive repeats of one type within 24 hours into one group', () => {
    const groups = groupConsecutiveActivity([
      entry('a', 'Consultation interrupted', 0),
      entry('b', 'Consultation interrupted', 3),
      entry('c', 'Consultation interrupted', 20),
      entry('d', 'New appointment request', 21),
    ]);
    expect(groups.map((group) => group.map((item) => item.id))).toEqual([['a', 'b', 'c'], ['d']]);
  });

  it('starts a new group past 24 hours from the group newest, and never folds non-consecutive repeats', () => {
    const groups = groupConsecutiveActivity([
      entry('a', 'Consultation interrupted', 0),
      entry('b', 'Consultation interrupted', 25),
      entry('c', 'New appointment request', 26),
      entry('d', 'Consultation interrupted', 27),
    ]);
    expect(groups.map((group) => group.map((item) => item.id))).toEqual([['a'], ['b'], ['c'], ['d']]);
  });

  it('groups a title the app does not know yet by its exact title', () => {
    const groups = groupConsecutiveActivity([entry('a', 'Something new', 0), entry('b', 'Something new', 1), entry('c', 'Something else', 2)]);
    expect(groups.map((group) => group.length)).toEqual([2, 1]);
  });
});

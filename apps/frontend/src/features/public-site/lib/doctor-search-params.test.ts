import { describe, expect, it } from 'vitest';
import { countActiveFilters, parseDoctorSearch, serializeDoctorSearch, toPublicDoctorQuery, DOCTORS_PAGE_SIZE } from './doctor-search-params';
import { findSpecialtyBySlug, toSpecialtySlug } from './specialty-slug';

describe('doctor search URL state', () => {
  it('round-trips every filter through the URL', () => {
    const query = 'specialty=cardiology&q=sarah&availability=week&minFee=200&maxFee=800&minYears=10&ranks=specialist%2Cconsultant&minRating=4.5&practice=independent&sort=lowest_fee&page=3';
    const state = parseDoctorSearch(new URLSearchParams(query));

    expect(state).toEqual({
      specialty: 'cardiology',
      q: 'sarah',
      availability: 'week',
      minFee: 200,
      maxFee: 800,
      minYears: 10,
      ranks: ['specialist', 'consultant'],
      minRating: 4.5,
      practice: 'independent',
      sort: 'lowest_fee',
      page: 3,
    });
    expect(serializeDoctorSearch(state)).toBe(query);
  });

  it('drops malformed values instead of sending them to the API', () => {
    const state = parseDoctorSearch({ availability: 'tomorrow', minFee: '-5', ranks: 'surgeon,consultant', minRating: '2', sort: 'cheapest', page: '0' });

    expect(state.availability).toBeUndefined();
    expect(state.minFee).toBeUndefined();
    expect(state.ranks).toEqual(['consultant']);
    expect(state.minRating).toBeUndefined();
    expect(state.sort).toBeUndefined();
    expect(state.page).toBeUndefined();
  });

  it('omits page 1 and empty values so an unfiltered URL stays clean', () => {
    expect(serializeDoctorSearch({ page: 1 })).toBe('');
  });

  it('defaults the API query to top rated, page 1, with the page size', () => {
    expect(toPublicDoctorQuery({}, 'specialty-1')).toMatchObject({ specialtyId: 'specialty-1', sort: 'top_rated', page: 1, limit: DOCTORS_PAGE_SIZE });
  });

  it('counts the specialty as a filter only where it is one', () => {
    const state = parseDoctorSearch({ specialty: 'cardiology', availability: 'today', minFee: '100', maxFee: '500' });
    expect(countActiveFilters(state, { includeSpecialty: true })).toBe(3);
    expect(countActiveFilters(state, { includeSpecialty: false })).toBe(2);
  });
});

describe('specialty slugs', () => {
  it('derives a stable, URL-safe slug from the English name', () => {
    expect(toSpecialtySlug('Otolaryngology (ENT)')).toBe('otolaryngology-ent');
    expect(toSpecialtySlug('Internal Medicine')).toBe('internal-medicine');
    expect(toSpecialtySlug('Obstetrics & Gynecology')).toBe('obstetrics-and-gynecology');
  });

  it('finds a specialty by its slug', () => {
    const specialties = [{ id: 'a', name: 'Cardiology', nameAr: null, doctorCount: 1 }];
    expect(findSpecialtyBySlug(specialties, 'cardiology')?.id).toBe('a');
    expect(findSpecialtyBySlug(specialties, 'dermatology')).toBeUndefined();
  });
});

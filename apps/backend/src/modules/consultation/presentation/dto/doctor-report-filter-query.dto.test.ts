import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DoctorReportFilterQueryDto } from './doctor-report-filter-query.dto.js';

describe('DoctorReportFilterQueryDto.toFilter', () => {
  it('defaults to the trailing 30 days ending now when both dates are absent', () => {
    const dto = new DoctorReportFilterQueryDto();
    const before = Date.now();

    const filter = dto.toFilter();

    const diffDays = (filter.dateTo.getTime() - filter.dateFrom.getTime()) / (24 * 60 * 60 * 1000);
    assert.equal(Math.round(diffDays), 30);
    assert.ok(filter.dateTo.getTime() >= before);
    assert.equal(filter.comparePrevious, false);
  });

  it('defaults dateTo to now when only dateFrom is given', () => {
    const dto = new DoctorReportFilterQueryDto();
    dto.dateFrom = '2026-01-01T00:00:00.000Z';
    const before = Date.now();

    const filter = dto.toFilter();

    assert.equal(filter.dateFrom.toISOString(), '2026-01-01T00:00:00.000Z');
    assert.ok(filter.dateTo.getTime() >= before);
  });

  it('defaults dateFrom to 30 days before dateTo when only dateTo is given', () => {
    const dto = new DoctorReportFilterQueryDto();
    dto.dateTo = '2026-01-31T00:00:00.000Z';

    const filter = dto.toFilter();

    assert.equal(filter.dateTo.toISOString(), '2026-01-31T00:00:00.000Z');
    assert.equal(filter.dateFrom.toISOString(), '2026-01-01T00:00:00.000Z');
  });

  it('parses comparePrevious from a boolean string', () => {
    const dto = new DoctorReportFilterQueryDto();
    dto.comparePrevious = 'true';

    assert.equal(dto.toFilter().comparePrevious, true);
  });

  it('uses both explicit dates when given', () => {
    const dto = new DoctorReportFilterQueryDto();
    dto.dateFrom = '2026-02-01T00:00:00.000Z';
    dto.dateTo = '2026-02-10T00:00:00.000Z';

    const filter = dto.toFilter();

    assert.equal(filter.dateFrom.toISOString(), '2026-02-01T00:00:00.000Z');
    assert.equal(filter.dateTo.toISOString(), '2026-02-10T00:00:00.000Z');
  });
});

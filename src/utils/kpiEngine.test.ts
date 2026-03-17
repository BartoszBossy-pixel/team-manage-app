import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { calculateKPIs, KPIEngine } from './kpiEngine';
import { makeIssue, makeCompleted } from '../test/fixtures';

// Suppress console.log noise from KPIEngine debug logging
beforeEach(() => { vi.spyOn(console, 'log').mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); });

const engine = new KPIEngine();

// ─── calculateKPIs (empty) ────────────────────────────────────────────────────

describe('calculateKPIs — empty inputs', () => {
  it('returns zeroed KPIs for empty lists', () => {
    const kpis = calculateKPIs([], []);
    expect(kpis.totalTasks).toBe(0);
    expect(kpis.completedTasks).toBe(0);
    expect(kpis.throughput).toBe(0);
    expect(kpis.avgCycleTime).toBe('0');
    expect(kpis.distribution.maintenance).toBe(0);
    expect(kpis.distribution.newProduct).toBe(0);
    expect(kpis.eddDeliveryMetrics.totalWithEDD).toBe(0);
  });
});

// ─── categorization ───────────────────────────────────────────────────────────

describe('calculateKPIs — categorization', () => {
  it('classifies Bug as maintenance', () => {
    const kpis = calculateKPIs(
      [makeIssue('GOLD-1', { issuetype: { name: 'Bug', id: '1' } })],
      []
    );
    expect(kpis.distribution.maintenance).toBe(100);
    expect(kpis.distribution.newProduct).toBe(0);
  });

  it('classifies Support as maintenance', () => {
    const kpis = calculateKPIs(
      [makeIssue('GOLD-1', { issuetype: { name: 'Support', id: '2' } })],
      []
    );
    expect(kpis.distribution.maintenance).toBe(100);
  });

  it('classifies Incident as maintenance', () => {
    const kpis = calculateKPIs(
      [makeIssue('GOLD-1', { issuetype: { name: 'Incident', id: '3' } })],
      []
    );
    expect(kpis.distribution.maintenance).toBe(100);
  });

  it('classifies Story as new product', () => {
    const kpis = calculateKPIs(
      [makeIssue('GOLD-1', { issuetype: { name: 'Story', id: '10001' } })],
      []
    );
    expect(kpis.distribution.newProduct).toBe(100);
    expect(kpis.distribution.maintenance).toBe(0);
  });

  it('classifies Task as new product', () => {
    const kpis = calculateKPIs(
      [makeIssue('GOLD-1', { issuetype: { name: 'Task', id: '3' } })],
      []
    );
    expect(kpis.distribution.newProduct).toBe(100);
  });

  it('calculates 50/50 distribution for one bug + one story', () => {
    const issues = [
      makeIssue('GOLD-1', { issuetype: { name: 'Bug', id: '1' } }),
      makeIssue('GOLD-2', { issuetype: { name: 'Story', id: '10001' } }),
    ];
    const kpis = calculateKPIs(issues, []);
    expect(kpis.distribution.maintenance).toBe(50);
    expect(kpis.distribution.newProduct).toBe(50);
  });

  it('distribution sums do not exceed 100%', () => {
    const issues = [
      makeIssue('GOLD-1', { issuetype: { name: 'Bug', id: '1' } }),
      makeIssue('GOLD-2', { issuetype: { name: 'Story', id: '10001' } }),
      makeIssue('GOLD-3', { issuetype: { name: 'Task', id: '3' } }),
    ];
    const kpis = calculateKPIs(issues, []);
    expect(kpis.distribution.maintenance + kpis.distribution.newProduct).toBeLessThanOrEqual(100.01);
  });
});

// ─── task counts ──────────────────────────────────────────────────────────────

describe('calculateKPIs — task counts', () => {
  it('counts total tasks correctly', () => {
    const issues = [makeIssue('G-1'), makeIssue('G-2'), makeIssue('G-3')];
    const kpis = calculateKPIs(issues, []);
    expect(kpis.totalTasks).toBe(3);
  });

  it('counts completed tasks correctly', () => {
    const completed = [makeCompleted('G-1'), makeCompleted('G-2')];
    const kpis = calculateKPIs(completed, completed);
    expect(kpis.completedTasks).toBe(2);
  });

  it('completed tasks can be a subset of all tasks', () => {
    const all = [makeIssue('G-1'), makeCompleted('G-2'), makeCompleted('G-3')];
    const done = [makeCompleted('G-2'), makeCompleted('G-3')];
    const kpis = calculateKPIs(all, done);
    expect(kpis.totalTasks).toBe(3);
    expect(kpis.completedTasks).toBe(2);
  });
});

// ─── cycle time ───────────────────────────────────────────────────────────────

describe('calculateKPIs — cycle time', () => {
  it('returns "0" when no completed issues', () => {
    const kpis = calculateKPIs([makeIssue('G-1')], []);
    expect(kpis.avgCycleTime).toBe('0');
  });

  it('calculates cycle time of exactly 10 days', () => {
    const issue = makeIssue('G-1', {
      created: '2024-01-01T00:00:00.000Z',
      resolutiondate: '2024-01-11T00:00:00.000Z',
    });
    const kpis = calculateKPIs([issue], [issue]);
    expect(parseFloat(kpis.avgCycleTime)).toBeCloseTo(10, 0);
  });

  it('averages cycle time across multiple issues', () => {
    const i1 = makeIssue('G-1', {
      created: '2024-01-01T00:00:00.000Z',
      resolutiondate: '2024-01-11T00:00:00.000Z', // 10 days
    });
    const i2 = makeIssue('G-2', {
      created: '2024-01-01T00:00:00.000Z',
      resolutiondate: '2024-01-21T00:00:00.000Z', // 20 days
    });
    const kpis = calculateKPIs([i1, i2], [i1, i2]);
    expect(parseFloat(kpis.avgCycleTime)).toBeCloseTo(15, 0); // avg of 10 and 20
  });

  it('ignores issues without resolutiondate in cycle time calculation', () => {
    const open = makeIssue('G-1'); // no resolutiondate
    const done = makeIssue('G-2', {
      created: '2024-01-01T00:00:00.000Z',
      resolutiondate: '2024-01-11T00:00:00.000Z',
    });
    const kpis = calculateKPIs([open, done], [done]);
    expect(parseFloat(kpis.avgCycleTime)).toBeCloseTo(10, 0);
  });
});

// ─── throughput ───────────────────────────────────────────────────────────────

describe('calculateKPIs — throughput', () => {
  it('returns 0 throughput when no completed issues', () => {
    const kpis = calculateKPIs([makeIssue('G-1')], []);
    expect(kpis.throughput).toBe(0);
  });

  it('returns positive throughput for multiple completed issues', () => {
    const completed = [
      makeCompleted('G-1', '2024-01-01T00:00:00.000Z'),
      makeCompleted('G-2', '2024-01-08T00:00:00.000Z'),
      makeCompleted('G-3', '2024-01-15T00:00:00.000Z'),
    ];
    const kpis = calculateKPIs(completed, completed);
    expect(kpis.throughput).toBeGreaterThan(0);
  });

  it('throughput is approximately 1 task/week for weekly completions', () => {
    const completed = [
      makeCompleted('G-1', '2024-01-01T00:00:00.000Z'),
      makeCompleted('G-2', '2024-01-08T00:00:00.000Z'),
      makeCompleted('G-3', '2024-01-15T00:00:00.000Z'),
    ];
    const kpis = calculateKPIs(completed, completed);
    // 3 tasks over 2 weeks ≈ 1.5 tasks/week
    expect(kpis.throughput).toBeGreaterThanOrEqual(1);
    expect(kpis.throughput).toBeLessThanOrEqual(3);
  });
});

// ─── type breakdown ───────────────────────────────────────────────────────────

describe('calculateKPIs — issue type breakdown', () => {
  it('maintenanceTypes counts issue types correctly', () => {
    const bugs = [
      makeIssue('G-1', { issuetype: { name: 'Bug', id: '1' } }),
      makeIssue('G-2', { issuetype: { name: 'Bug', id: '1' } }),
      makeIssue('G-3', { issuetype: { name: 'Support', id: '2' } }),
    ];
    const kpis = calculateKPIs(bugs, []);
    expect(kpis.maintenanceTypes['Bug']).toBe(2);
    expect(kpis.maintenanceTypes['Support']).toBe(1);
  });

  it('newProductTypes counts issue types correctly', () => {
    const issues = [
      makeIssue('G-1', { issuetype: { name: 'Story', id: '10001' } }),
      makeIssue('G-2', { issuetype: { name: 'Story', id: '10001' } }),
      makeIssue('G-3', { issuetype: { name: 'Task', id: '3' } }),
    ];
    const kpis = calculateKPIs(issues, []);
    expect(kpis.newProductTypes['Story']).toBe(2);
    expect(kpis.newProductTypes['Task']).toBe(1);
  });
});

// ─── EDD delivery metrics ─────────────────────────────────────────────────────

describe('KPIEngine.calculateEDDDeliveryMetrics', () => {
  it('returns zeroed metrics when no completed issues', () => {
    const metrics = engine.calculateEDDDeliveryMetrics([]);
    expect(metrics.totalWithEDD).toBe(0);
    expect(metrics.deliveredOnTime).toBe(0);
    expect(metrics.deliveredLate).toBe(0);
    expect(metrics.onTimePercentage).toBe(0);
  });

  it('returns zeroed metrics when no issue has an EDD field', () => {
    const metrics = engine.calculateEDDDeliveryMetrics([makeCompleted('G-1')]);
    expect(metrics.totalWithEDD).toBe(0);
  });

  it('marks issue as on time when resolution date <= EDD', () => {
    const issue = {
      ...makeCompleted('G-1', '2024-03-01T00:00:00.000Z'),
      fields: {
        ...makeCompleted('G-1', '2024-03-01T00:00:00.000Z').fields,
        customfield_13587: '2024-03-05', // EDD is after resolution — on time
      },
    };
    const metrics = engine.calculateEDDDeliveryMetrics([issue]);
    expect(metrics.totalWithEDD).toBe(1);
    expect(metrics.deliveredOnTime).toBe(1);
    expect(metrics.deliveredLate).toBe(0);
    expect(metrics.onTimePercentage).toBe(100);
  });

  it('marks issue as late when resolution date > EDD', () => {
    const issue = {
      ...makeCompleted('G-1', '2024-03-10T00:00:00.000Z'),
      fields: {
        ...makeCompleted('G-1', '2024-03-10T00:00:00.000Z').fields,
        customfield_13587: '2024-03-05', // EDD is before resolution — late
      },
    };
    const metrics = engine.calculateEDDDeliveryMetrics([issue]);
    expect(metrics.deliveredOnTime).toBe(0);
    expect(metrics.deliveredLate).toBe(1);
    expect(metrics.onTimePercentage).toBe(0);
  });

  it('onTimePercentage is 50 for 1 on-time and 1 late', () => {
    const onTime = {
      ...makeCompleted('G-1', '2024-03-01T00:00:00.000Z'),
      fields: {
        ...makeCompleted('G-1', '2024-03-01T00:00:00.000Z').fields,
        customfield_13587: '2024-03-05',
      },
    };
    const late = {
      ...makeCompleted('G-2', '2024-03-10T00:00:00.000Z'),
      fields: {
        ...makeCompleted('G-2', '2024-03-10T00:00:00.000Z').fields,
        customfield_13587: '2024-03-05',
      },
    };
    const metrics = engine.calculateEDDDeliveryMetrics([onTime, late]);
    expect(metrics.totalWithEDD).toBe(2);
    expect(metrics.onTimePercentage).toBe(50);
  });
});

// ─── calculateKPIsForPeriod ───────────────────────────────────────────────────

describe('KPIEngine.calculateKPIsForPeriod', () => {
  it('filters to only issues created within the date range', () => {
    const inRange = makeIssue('G-1', { created: '2024-06-15T00:00:00.000Z' });
    const outOfRange = makeIssue('G-2', { created: '2024-01-01T00:00:00.000Z' });

    const kpis = engine.calculateKPIsForPeriod(
      [inRange, outOfRange],
      [],
      new Date('2024-06-01'),
      new Date('2024-06-30')
    );
    expect(kpis.totalTasks).toBe(1);
  });

  it('filters completed issues to the resolution date range', () => {
    // created must also be in range so total > 0 (otherwise calculateKPIs short-circuits)
    const inRange = makeIssue('G-1', {
      created: '2024-06-05T00:00:00.000Z',
      resolutiondate: '2024-06-15T00:00:00.000Z',
    });
    const outOfRange = makeIssue('G-2', {
      created: '2024-01-01T00:00:00.000Z',
      resolutiondate: '2024-01-15T00:00:00.000Z',
    });

    const kpis = engine.calculateKPIsForPeriod(
      [inRange, outOfRange],
      [inRange, outOfRange],
      new Date('2024-06-01'),
      new Date('2024-06-30')
    );
    expect(kpis.completedTasks).toBe(1);
  });
});

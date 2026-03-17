/**
 * CSS regression canary tests.
 *
 * These tests read src/index.css as plain text and assert that critical
 * CSS class names and property values are still present.  They don't
 * render anything — they simply guard against accidental removal of
 * important styles during refactors.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cssPath = resolve(__dirname, '../../src/index.css');
const css = readFileSync(cssPath, 'utf8');

// ─── Layout / container classes ───────────────────────────────────────────────

describe('CSS — layout classes present', () => {
  it('has .team-tasks-table', () => {
    expect(css).toContain('.team-tasks-table');
  });

  it('has .table-header', () => {
    expect(css).toContain('.table-header');
  });

  it('has .kpi-card', () => {
    expect(css).toContain('.kpi-card');
  });

  it('has .kpi-card-wrapper', () => {
    expect(css).toContain('.kpi-card-wrapper');
  });

  it('has .dashboard-header', () => {
    expect(css).toContain('.dashboard-header');
  });
});

// ─── Subtask row styling ──────────────────────────────────────────────────────

describe('CSS — subtask row classes present', () => {
  it('has .team-tasks-table tr.subtask-row rule', () => {
    expect(css).toContain('tr.subtask-row');
  });

  it('has :hover rule for subtask-row', () => {
    expect(css).toMatch(/subtask-row:hover/);
  });
});

// ─── KPI card interactive states ──────────────────────────────────────────────

describe('CSS — KPI card states present', () => {
  it('has .kpi-card:hover rule', () => {
    expect(css).toContain('.kpi-card:hover');
  });

  it('has .kpi-card.hidden rule', () => {
    expect(css).toContain('.kpi-card.hidden');
  });
});

// ─── Source component canary: subtask-row class name ─────────────────────────
// Guard against renaming the class in components without updating the CSS.

describe('CSS canary — component source uses "subtask-row" class name', () => {
  const componentsDir = resolve(__dirname, '../components');
  const tablesWithSubtasks = [
    'InProgressTable.tsx',
    'AwaitingProdTable.tsx',
    'ToTakeTable.tsx',
    'MoreInfoRequestTable.tsx',
  ];

  tablesWithSubtasks.forEach(file => {
    it(`${file} references "subtask-row" CSS class`, () => {
      const src = readFileSync(resolve(componentsDir, file), 'utf8');
      expect(src).toContain('subtask-row');
    });
  });
});

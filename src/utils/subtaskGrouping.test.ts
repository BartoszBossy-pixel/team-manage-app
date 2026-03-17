import { describe, it, expect } from 'vitest';
import { isSubtask, groupIssuesWithSubtasks, ensureParentsIncluded } from './subtaskGrouping';
import { makeIssue, makeSubtask } from '../test/fixtures';

// ─── isSubtask ────────────────────────────────────────────────────────────────

describe('isSubtask', () => {
  it('returns false for a regular Story', () => {
    expect(isSubtask(makeIssue('GOLD-1'))).toBe(false);
  });

  it('returns false for a Task without parent field', () => {
    expect(isSubtask(makeIssue('GOLD-1', { issuetype: { name: 'Task', id: '3' } }))).toBe(false);
  });

  it('returns true for issue with type "Sub-task" (exact case)', () => {
    const sub = makeIssue('GOLD-2', { issuetype: { name: 'Sub-task', id: '5' } });
    expect(isSubtask(sub)).toBe(true);
  });

  it('returns true for issue with type "sub-task" (lowercase)', () => {
    const sub = makeIssue('GOLD-2', { issuetype: { name: 'sub-task', id: '5' } });
    expect(isSubtask(sub)).toBe(true);
  });

  it('returns true for issue with a parent field regardless of issuetype', () => {
    const sub = makeSubtask('GOLD-3', 'GOLD-1');
    expect(isSubtask(sub)).toBe(true);
  });

  it('returns false when parent field is explicitly absent', () => {
    const issue = makeIssue('GOLD-4'); // no parent override
    expect(isSubtask(issue)).toBe(false);
  });
});

// ─── groupIssuesWithSubtasks ──────────────────────────────────────────────────

describe('groupIssuesWithSubtasks', () => {
  it('returns empty array for empty input', () => {
    expect(groupIssuesWithSubtasks([])).toEqual([]);
  });

  it('returns standalone groups for issues with no subtasks', () => {
    const issues = [makeIssue('GOLD-1'), makeIssue('GOLD-2')];
    const groups = groupIssuesWithSubtasks(issues);
    expect(groups).toHaveLength(2);
    groups.forEach(g => {
      expect(g.subtasks).toHaveLength(0);
      expect(g.isOrphanSubtask).toBe(false);
    });
  });

  it('attaches subtasks to the correct parent', () => {
    const parent = makeIssue('GOLD-1');
    const s1 = makeSubtask('GOLD-2', 'GOLD-1');
    const s2 = makeSubtask('GOLD-3', 'GOLD-1');

    const groups = groupIssuesWithSubtasks([parent, s1, s2]);

    expect(groups).toHaveLength(1);
    expect(groups[0].parent.key).toBe('GOLD-1');
    expect(groups[0].subtasks.map(s => s.key)).toEqual(['GOLD-2', 'GOLD-3']);
    expect(groups[0].isOrphanSubtask).toBe(false);
  });

  it('distributes subtasks to their respective parents', () => {
    const p1 = makeIssue('GOLD-1');
    const p2 = makeIssue('GOLD-2');
    const s1 = makeSubtask('GOLD-3', 'GOLD-1');
    const s2 = makeSubtask('GOLD-4', 'GOLD-2');

    const groups = groupIssuesWithSubtasks([p1, p2, s1, s2]);

    expect(groups).toHaveLength(2);
    const g1 = groups.find(g => g.parent.key === 'GOLD-1')!;
    const g2 = groups.find(g => g.parent.key === 'GOLD-2')!;
    expect(g1.subtasks[0].key).toBe('GOLD-3');
    expect(g2.subtasks[0].key).toBe('GOLD-4');
  });

  it('treats subtask as orphan when parent is not in list', () => {
    const sub = makeSubtask('GOLD-99', 'GOLD-1');

    const groups = groupIssuesWithSubtasks([sub]);

    expect(groups).toHaveLength(1);
    expect(groups[0].parent.key).toBe('GOLD-99');
    expect(groups[0].subtasks).toHaveLength(0);
    expect(groups[0].isOrphanSubtask).toBe(true);
  });

  it('parent appears before its subtasks in output order', () => {
    const parent = makeIssue('GOLD-1');
    const sub = makeSubtask('GOLD-2', 'GOLD-1');

    const groups = groupIssuesWithSubtasks([sub, parent]); // sub before parent in input
    expect(groups[0].parent.key).toBe('GOLD-1');
  });

  it('parent with no subtasks has empty subtasks array', () => {
    const parent = makeIssue('GOLD-1');
    const other = makeIssue('GOLD-2');

    const groups = groupIssuesWithSubtasks([parent, other]);
    expect(groups.every(g => g.subtasks.length === 0)).toBe(true);
  });
});

// ─── ensureParentsIncluded ────────────────────────────────────────────────────

describe('ensureParentsIncluded', () => {
  it('returns filtered list unchanged when no subtasks present', () => {
    const issues = [makeIssue('GOLD-1'), makeIssue('GOLD-2')];
    const result = ensureParentsIncluded(issues, issues);
    expect(result).toHaveLength(2);
  });

  it('adds missing parent when a subtask passes the filter', () => {
    const parent = makeIssue('GOLD-1');
    const sub = makeSubtask('GOLD-2', 'GOLD-1');
    const allIssues = [parent, sub];

    // Only the subtask passes filter (e.g. assignee filter), parent does not
    const result = ensureParentsIncluded([sub], allIssues);

    expect(result.map(i => i.key)).toContain('GOLD-1');
    expect(result.map(i => i.key)).toContain('GOLD-2');
  });

  it('does not duplicate parent when already present in filtered list', () => {
    const parent = makeIssue('GOLD-1');
    const sub = makeSubtask('GOLD-2', 'GOLD-1');
    const allIssues = [parent, sub];

    const result = ensureParentsIncluded([parent, sub], allIssues);

    const parentCount = result.filter(i => i.key === 'GOLD-1').length;
    expect(parentCount).toBe(1);
  });

  it('returns unchanged list when subtask parent is not found in allIssues', () => {
    const sub = makeSubtask('GOLD-2', 'GOLD-1'); // parent not in allIssues

    const result = ensureParentsIncluded([sub], [sub]);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('GOLD-2');
  });

  it('handles multiple subtasks from different parents', () => {
    const p1 = makeIssue('GOLD-1');
    const p2 = makeIssue('GOLD-2');
    const s1 = makeSubtask('GOLD-3', 'GOLD-1');
    const s2 = makeSubtask('GOLD-4', 'GOLD-2');
    const allIssues = [p1, p2, s1, s2];

    // Only subtasks pass filter
    const result = ensureParentsIncluded([s1, s2], allIssues);

    expect(result.map(i => i.key)).toContain('GOLD-1');
    expect(result.map(i => i.key)).toContain('GOLD-2');
    expect(result.map(i => i.key)).toContain('GOLD-3');
    expect(result.map(i => i.key)).toContain('GOLD-4');
  });
});

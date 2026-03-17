import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPixelsTeamJql, fetchPixelsTeamMembers, clearPixelsTeamCache } from './pixelsTeam';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── getPixelsTeamJql ─────────────────────────────────────────────────────────

describe('getPixelsTeamJql', () => {
  it('returns a JQL fragment using the Jira team field', () => {
    const jql = getPixelsTeamJql();
    expect(jql).toContain('"Team (GOLD)[Dropdown]"=Pixels');
  });

  it('does NOT contain hardcoded Jira account IDs', () => {
    const jql = getPixelsTeamJql();
    // Jira cloud account IDs are base58-encoded strings like "557058:..." or "712020:..."
    expect(jql).not.toMatch(/557058:|712020:/);
    // Should not reference VITE_ID env var names either
    expect(jql).not.toMatch(/VITE_ID/);
  });
});

// ─── fetchPixelsTeamMembers ───────────────────────────────────────────────────

describe('fetchPixelsTeamMembers', () => {
  beforeEach(() => {
    clearPixelsTeamCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts unique members from issue assignees', async () => {
    const mockIssues = [
      { fields: { assignee: { accountId: 'acc-1', displayName: 'Alice', emailAddress: 'alice@test.com' } } },
      { fields: { assignee: { accountId: 'acc-2', displayName: 'Bob', emailAddress: 'bob@test.com' } } },
      { fields: { assignee: { accountId: 'acc-1', displayName: 'Alice', emailAddress: 'alice@test.com' } } }, // duplicate
      { fields: { assignee: null } }, // no assignee
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ issues: mockIssues }),
    }));

    const members = await fetchPixelsTeamMembers();
    expect(members).toHaveLength(2);
    expect(members.map(m => m.accountId)).toEqual(['acc-1', 'acc-2']);
  });

  it('throws when HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 401 }));
    await expect(fetchPixelsTeamMembers()).rejects.toThrow('HTTP 401');
  });

  it('returns cached result on second call without re-fetching', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ issues: [
        { fields: { assignee: { accountId: 'acc-1', displayName: 'Alice' } } },
      ]}),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchPixelsTeamMembers();
    await fetchPixelsTeamMembers();
    expect(mockFetch).toHaveBeenCalledTimes(1); // second call hit cache
  });
});

// ─── Source code canary tests ─────────────────────────────────────────────────
// These tests verify that no component still hardcodes Jira account IDs in JQL.

describe('source code canary — no hardcoded account IDs in JQL', () => {
  const componentsDir = resolve(__dirname, '../components');
  const componentFiles = [
    'InProgressTable.tsx',
    'AwaitingProdTable.tsx',
    'ToTakeTable.tsx',
    'MoreInfoRequestTable.tsx',
    'JiraTimeline.tsx',
    'DevTasksTable.tsx',
  ];

  const hardcodedPattern = /OR assignee in\(\$\{.*?VITE_ID/;

  componentFiles.forEach(file => {
    it(`${file} does not use hardcoded VITE_ID env vars in assignee JQL filter`, () => {
      const src = readFileSync(join(componentsDir, file), 'utf8');
      expect(src).not.toMatch(hardcodedPattern);
    });
  });

  it('jiraClient.ts getPixelsTeamFilter does not build assignee in(...) from VITE_ID vars', () => {
    const src = readFileSync(
      resolve(__dirname, '../api/jiraClient.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/OR assignee in\(\$\{teamIds\}\)/);
    expect(src).not.toMatch(/VITE_ID_ALICJA.*VITE_ID_RAKU/s);
  });
});

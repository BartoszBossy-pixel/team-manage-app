import { JiraIssue } from '../api/jiraClient';

/**
 * Factory to create minimal valid JiraIssue objects for tests.
 * Pass key as first arg, then optional field overrides.
 */
export function makeIssue(
  key: string,
  fieldsOverride: Partial<JiraIssue['fields']> = {}
): JiraIssue {
  return {
    key,
    fields: {
      issuetype: { name: 'Story', id: '10001' },
      created: '2024-01-01T00:00:00.000Z',
      resolutiondate: null,
      status: { name: 'In Progress', id: '3' },
      summary: `Summary for ${key}`,
      ...fieldsOverride,
    },
  };
}

/**
 * Creates a sub-task issue linked to a given parent key.
 */
export function makeSubtask(key: string, parentKey: string, parentSummary = 'Parent issue'): JiraIssue {
  return makeIssue(key, {
    issuetype: { name: 'Sub-task', id: '5' },
    parent: {
      key: parentKey,
      fields: {
        summary: parentSummary,
        status: { name: 'In Progress', id: '3' },
        issuetype: { name: 'Story', id: '10001' },
      },
    },
  });
}

/**
 * Creates a completed issue (with resolutiondate set).
 */
export function makeCompleted(key: string, resolvedAt = '2024-06-01T00:00:00.000Z'): JiraIssue {
  return makeIssue(key, { resolutiondate: resolvedAt });
}

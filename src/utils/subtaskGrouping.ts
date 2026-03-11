import { JiraIssue } from '../api/jiraClient';

export interface GroupedIssue {
  parent: JiraIssue;
  subtasks: JiraIssue[];
  isOrphanSubtask: boolean;
}

export function isSubtask(issue: JiraIssue): boolean {
  return (
    issue.fields.issuetype.name.toLowerCase() === 'sub-task' ||
    issue.fields.parent !== undefined
  );
}

export function groupIssuesWithSubtasks(issues: JiraIssue[]): GroupedIssue[] {
  const parentKeys = new Set<string>();
  const subtasksByParent = new Map<string, JiraIssue[]>();
  const parentIssues: JiraIssue[] = [];
  const orphanSubtasks: JiraIssue[] = [];

  // Zbierz klucze wszystkich parentów (issues które nie są subtaskami)
  issues.forEach(issue => {
    if (!isSubtask(issue)) {
      parentKeys.add(issue.key);
      parentIssues.push(issue);
    }
  });

  // Przypisz subtaski do parentów lub do orphan list
  issues.forEach(issue => {
    if (isSubtask(issue)) {
      const parentKey = issue.fields.parent?.key;
      if (parentKey && parentKeys.has(parentKey)) {
        if (!subtasksByParent.has(parentKey)) {
          subtasksByParent.set(parentKey, []);
        }
        subtasksByParent.get(parentKey)!.push(issue);
      } else {
        // Parent nie jest w aktualnej liście - pokaż subtask jako samodzielny wiersz
        orphanSubtasks.push(issue);
      }
    }
  });

  const grouped: GroupedIssue[] = parentIssues.map(parent => ({
    parent,
    subtasks: subtasksByParent.get(parent.key) || [],
    isOrphanSubtask: false,
  }));

  // Orphan subtaski bez parenta w liście - pokazuj normalnie
  orphanSubtasks.forEach(sub => {
    grouped.push({ parent: sub, subtasks: [], isOrphanSubtask: true });
  });

  return grouped;
}

// Gdy filtr jest aktywny i subtask go spełnia - upewnia się że jego parent też jest w liście
export function ensureParentsIncluded(
  filtered: JiraIssue[],
  allIssues: JiraIssue[]
): JiraIssue[] {
  const requiredParentKeys = new Set<string>();
  filtered.forEach(issue => {
    if (isSubtask(issue) && issue.fields.parent?.key) {
      requiredParentKeys.add(issue.fields.parent.key);
    }
  });

  if (requiredParentKeys.size === 0) return filtered;

  const filteredKeys = new Set(filtered.map(i => i.key));
  const missingParents = allIssues.filter(
    issue => requiredParentKeys.has(issue.key) && !filteredKeys.has(issue.key)
  );

  return [...filtered, ...missingParents];
}

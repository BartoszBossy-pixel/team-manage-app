export interface PixelsMember {
  accountId: string;
  displayName: string;
  emailAddress?: string;
}

// Module-level cache
let _cache: PixelsMember[] | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Returns the JQL fragment that identifies Pixels team tasks.
 * Uses Jira's team field only — NO hardcoded account IDs.
 */
export function getPixelsTeamJql(): string {
  return '"Team (GOLD)[Dropdown]"=Pixels';
}

/**
 * Strategy A: fetch members directly from a Jira group.
 * Requires VITE_JIRA_PIXELS_GROUP env var to be set.
 */
async function fetchMembersFromGroup(env: ImportMetaEnv): Promise<PixelsMember[]> {
  const groupname = env.VITE_JIRA_PIXELS_GROUP;
  if (!groupname) throw new Error('VITE_JIRA_PIXELS_GROUP not configured');

  const url =
    `${env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/jira-group-members?` +
    new URLSearchParams({
      groupname,
      domain: env.VITE_JIRA_DOMAIN || '',
      auth: btoa(`${env.VITE_JIRA_EMAIL || ''}:${env.VITE_JIRA_API_TOKEN || ''}`),
    });

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.error('[pixelsTeam] fetchMembersFromGroup error body:', body.slice(0, 200));
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.members as PixelsMember[]) ?? [];
}

/**
 * Strategy B: scan recent Pixels-tagged issues and collect unique assignees.
 * Fallback when no group is configured.
 */
async function fetchMembersFromIssues(env: ImportMetaEnv): Promise<PixelsMember[]> {
  const project = env.VITE_GLOBAL_DELIVERY || 'Global Delivery';
  const jql =
    `project="${project}" AND ${getPixelsTeamJql()} AND "Platform[Dropdown]" in (SE) AND created >= -180d`;

  const url =
    `${env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/jira-search?` +
    new URLSearchParams({
      domain: env.VITE_JIRA_DOMAIN || '',
      auth: btoa(`${env.VITE_JIRA_EMAIL || ''}:${env.VITE_JIRA_API_TOKEN || ''}`),
      jql,
      maxResults: '200',
    });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const map = new Map<string, PixelsMember>();
  for (const issue of data.issues ?? []) {
    const a = issue.fields?.assignee;
    if (a?.accountId && !map.has(a.accountId)) {
      map.set(a.accountId, {
        accountId: a.accountId,
        displayName: a.displayName,
        emailAddress: a.emailAddress,
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Fetches Pixels team members.
 * Uses Jira Group API when VITE_JIRA_PIXELS_GROUP is set,
 * falls back to scanning issue assignees otherwise.
 * Results cached for 5 minutes.
 */
export async function fetchPixelsTeamMembers(): Promise<PixelsMember[]> {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL_MS) return _cache;

  const env = import.meta.env;
  let members: PixelsMember[];

  if (env.VITE_JIRA_PIXELS_GROUP) {
    try {
      members = await fetchMembersFromGroup(env);
    } catch (e) {
      console.error('[pixelsTeam] Group API failed, falling back to issue scan. Error:', e);
      members = await fetchMembersFromIssues(env);
    }
  } else {
    members = await fetchMembersFromIssues(env);
  }

  _cache = members;
  _cacheTime = Date.now();
  return _cache;
}

/** Clears the in-memory cache. */
export function clearPixelsTeamCache(): void {
  _cache = null;
  _cacheTime = 0;
}

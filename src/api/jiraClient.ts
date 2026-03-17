import axios from 'axios';
import { getPixelsTeamJql } from '../utils/pixelsTeam';

// TypeScript interfaces for Jira API responses
export interface JiraIssue {
  key: string;
  fields: {
    issuetype: {
      name: string;
      id: string;
    };
    created: string;
    resolutiondate: string | null;
    status: {
      name: string;
      id: string;
    };
    summary: string;
    priority?: {
      name: string;
      id: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
      emailAddress: string;
    };
    parent?: {
      key: string;
      fields: {
        summary: string;
        status: { name: string; id: string; };
        issuetype: { name: string; id: string; };
      };
    };
    // Custom fields for EDD dates - these might be custom fields in your Jira instance
    customfield_10001?: string; // EDD Start - Expected Development Start Date
    customfield_10002?: string; // ETA Dev - Estimated Time of Arrival for Development
    customfield_10003?: string; // EDD Dev - Expected Development Delivery Date
    // Alternative field names if they're standard fields
    'EDD Start'?: string;
    'ETA Dev'?: string;
    'EDD Dev'?: string;
  };
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  active: boolean;
  role?: string; // Rola użytkownika z Jira Project Roles API
}

// Interfejsy dla Jira Project Roles API
export interface JiraProjectRole {
  self: string;
  name: string;
  id: number;
  description: string;
  actors: JiraRoleActor[];
}

export interface JiraRoleActor {
  id: number;
  displayName: string;
  type: string; // 'atlassian-user-role-actor', 'atlassian-group-role-actor', etc.
  name: string;
  avatarUrl?: string;
  actorUser?: {
    accountId: string;
    displayName: string;
    emailAddress: string;
  };
}

export interface JiraProjectRolesResponse {
  [roleName: string]: string; // URL do konkretnej roli
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
}

export interface JiraClientConfig {
  projectKey: string;
}

class JiraClient {
  private config: JiraClientConfig;
  private baseURL: string;

  constructor(config: JiraClientConfig) {
    this.config = config;
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }

  async fetchIssues(jql: string, maxResults: number = 100): Promise<JiraIssue[]> {
    try {
      const response = await axios.get<JiraSearchResponse>(`${this.baseURL}/api/jira-search`, {
        params: {
          jql,
          maxResults,
        }
      });
      
      return response.data.issues;
    } catch (error) {
      console.error('Error fetching Jira issues:', error);
      throw new Error('Failed to fetch issues from Jira');
    }
  }

  // Helper method to get Pixels team filter (uses Jira team field — no hardcoded account IDs)
  private getPixelsTeamFilter(): string {
    const project = import.meta.env.VITE_GLOBAL_DELIVERY || 'Global Delivery';
    return `project="${project}" AND ${getPixelsTeamJql()} AND "Platform[Dropdown]" in (SE)`;
  }

  async fetchProjectIssues(status?: string): Promise<JiraIssue[]> {
    let jql = this.getPixelsTeamFilter();
    
    if (status) {
      jql += ` AND status = "${status}"`;
    }
    
    // Fetch issues from last 3 months for better KPI calculation
    jql += ' AND created >= -280d';

    console.log(`[fetchProjectIssues] Fetching ${jql} issues`);
    
    return this.fetchIssues(jql);
  }

  async fetchCompletedIssues(): Promise<JiraIssue[]> {
    const jql = `${this.getPixelsTeamFilter()} AND status in (Done, Completed) AND resolutiondate >= -290d`;

    console.log(`[fetchCompletedIssues] Fetching ${jql} issues`);

    return this.fetchIssues(jql);
  }

  async fetchIssuesByType(issueTypes: string[]): Promise<JiraIssue[]> {
    const typeFilter = issueTypes.map(type => `"${type}"`).join(', ');
    const jql = `${this.getPixelsTeamFilter()} AND issuetype in (${typeFilter}) AND created >= -290d`;

    console.log(`[fetchIssuesByType] Fetching ${jql} issues`);

    return this.fetchIssues(jql);
  }

  async fetchPixelsCompletedIssues(): Promise<JiraIssue[]> {
    // Pobierz ukończone zadania zespołu Pixels - teraz używa tej samej metody co inne
    const jql = `${this.getPixelsTeamFilter()} AND status in (Done, Completed) AND resolutiondate >= -190d ORDER BY resolutiondate DESC`;

    console.log(`[fetchPixelsCompletedIssues] Fetching ${jql} issues`);

    return this.fetchIssues(jql, 500);
  }

  // Pobierz wszystkie role projektowe
  async fetchProjectRoles(): Promise<JiraProjectRolesResponse> {
    try {
      const response = await axios.get<JiraProjectRolesResponse>(`${this.baseURL}/api/jira-project-roles`, {
        params: {
          projectKey: this.config.projectKey,
        }
      });
      
      console.log(`[fetchProjectRoles] Found ${Object.keys(response.data).length} project roles`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project roles:', error);
      throw new Error('Failed to fetch project roles from Jira');
    }
  }

  // Pobierz szczegóły konkretnej roli projektowej
  async fetchProjectRoleDetails(roleId: number): Promise<JiraProjectRole> {
    try {
      const response = await axios.get<JiraProjectRole>(`${this.baseURL}/api/jira-project-role`, {
        params: {
          projectKey: this.config.projectKey,
          roleId: roleId,
        }
      });
      
      console.log(`[fetchProjectRoleDetails] Found role ${response.data.name} with ${response.data.actors.length} actors`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching project role ${roleId}:`, error);
      throw new Error(`Failed to fetch project role ${roleId} from Jira`);
    }
  }

  // Pobierz mapowanie użytkowników do ról projektowych
  async fetchUserProjectRoles(): Promise<Map<string, string>> {
    try {
      console.log('[fetchUserProjectRoles] Fetching user roles from Jira Project Roles API');
      
      // Pobierz wszystkie role projektowe
      const projectRoles = await this.fetchProjectRoles();
      const userRoleMap = new Map<string, string>();
      
      // Dla każdej roli, pobierz szczegóły i wyciągnij użytkowników
      for (const [roleName, roleUrl] of Object.entries(projectRoles)) {
        try {
          // Wyciągnij ID roli z URL
          const roleIdMatch = roleUrl.match(/\/role\/(\d+)$/);
          if (!roleIdMatch) {
            console.warn(`[fetchUserProjectRoles] Could not extract role ID from URL: ${roleUrl}`);
            continue;
          }
          
          const roleId = parseInt(roleIdMatch[1]);
          const roleDetails = await this.fetchProjectRoleDetails(roleId);
          
          // Przejdź przez wszystkich aktorów roli
          for (const actor of roleDetails.actors) {
            if (actor.type === 'atlassian-user-role-actor' && actor.actorUser) {
              const email = actor.actorUser.emailAddress;
              if (email) {
                // Jeśli użytkownik już ma rolę, zachowaj pierwszą znalezioną (zazwyczaj najważniejszą)
                if (!userRoleMap.has(email)) {
                  userRoleMap.set(email, roleName);
                  console.log(`[fetchUserProjectRoles] Mapped ${email} to role: ${roleName}`);
                }
              }
            }
          }
        } catch (roleError) {
          console.warn(`[fetchUserProjectRoles] Failed to fetch details for role ${roleName}:`, roleError);
        }
      }
      
      console.log(`[fetchUserProjectRoles] Successfully mapped ${userRoleMap.size} users to project roles`);
      return userRoleMap;
    } catch (error) {
      console.error('Error fetching user project roles:', error);
      throw new Error('Failed to fetch user project roles from Jira');
    }
  }

  async fetchPixelsTeamUsers(): Promise<JiraUser[]> {
    try {
      const jql = `${this.getPixelsTeamFilter()} AND created >= -180d`;
      console.log(`[fetchPixelsTeamUsers] Fetching team users from: ${jql}`);

      const issues = await this.fetchIssues(jql, 500);

      const usersMap = new Map<string, JiraUser>();
      issues.forEach(issue => {
        if (issue.fields.assignee) {
          const { accountId, displayName, emailAddress } = issue.fields.assignee;
          if (accountId && !usersMap.has(accountId)) {
            usersMap.set(accountId, {
              accountId,
              displayName,
              emailAddress,
              active: true,
            });
          }
        }
      });

      const users = Array.from(usersMap.values());
      console.log(`[fetchPixelsTeamUsers] Found ${users.length} Pixels team members`);
      return users;
    } catch (error) {
      console.error('Error fetching Pixels team users:', error);
      throw new Error('Failed to fetch team users from Jira');
    }
  }

}


// Factory function to create Jira client with environment variables
export const createJiraClient = (): JiraClient => {
  const config: JiraClientConfig = {
    projectKey: import.meta.env.VITE_JIRA_PROJECT_KEY || '',
  };
  return new JiraClient(config);
};

export default JiraClient;
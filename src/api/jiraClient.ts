import axios from 'axios';

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
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

class JiraClient {
  private config: JiraClientConfig;
  private baseURL: string;

  constructor(config: JiraClientConfig) {
    this.config = config;
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }

  private getAuthHeader(): string {
    const credentials = `${this.config.email}:${this.config.apiToken}`;
    return btoa(credentials);
  }

  async fetchIssues(jql: string, maxResults: number = 100): Promise<JiraIssue[]> {
    try {
      const response = await axios.get<JiraSearchResponse>(`${this.baseURL}/api/jira-search`, {
        params: {
          jql,
          maxResults,
          domain: this.config.domain,
          auth: this.getAuthHeader()
        }
      });
      
      return response.data.issues;
    } catch (error) {
      console.error('Error fetching Jira issues:', error);
      throw new Error('Failed to fetch issues from Jira');
    }
  }

  // Helper method to get Pixels team filter
  private getPixelsTeamFilter(): string {
    const env = import.meta.env;
    return `project="${env.VITE_GLOBAL_DELIVERY || 'Global Delivery'}" AND ("Team (GOLD)[Dropdown]"=Pixels OR assignee in(${env.ID_ALICJA},${env.ID_RAKU},${env.ID_SZYMON},${env.ID_TOMEK}, ${env.ID_KRZYSIEK}, ${env.ID_OLIWER})) AND "Platform[Dropdown]" in (SE)`;
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
          domain: this.config.domain,
          auth: this.getAuthHeader()
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
          domain: this.config.domain,
          auth: this.getAuthHeader()
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
      // Pobierz zadania zespołu Pixels - używa tej samej metody filtrowania
      const jql = `${this.getPixelsTeamFilter()} AND created >= -180d`;
      
      console.log(`[fetchPixelsTeamUsers] Fetching team users from: ${jql}`);
      
      const issues = await this.fetchIssues(jql, 500);
      
      // Pobierz mapowanie użytkowników do ról projektowych z Jira
      let userRoleMap: Map<string, string> | null = null;
      try {
        userRoleMap = await this.fetchUserProjectRoles();
      } catch (roleError) {
        console.warn('[fetchPixelsTeamUsers] Failed to fetch project roles, will use fallback mapping:', roleError);
      }
      
      // Wyciągnij unikalnych użytkowników z assignee
      const usersMap = new Map<string, JiraUser>();
      
      // Lista znanych członków zespołu Pixels (na podstawie emaili które widziałeś w tabelach)
      const knownPixelsMembers = [
        'krzysztof.rak@auctane.com',
        'alicja.wolnik-kuzminska@auctane.com',
        'oliwer.pawelski@auctane.com',
        'tomasz.rusinski@auctane.com',
        'krzysztof.adamek@auctane.com',
        'bartosz.bossy@auctane.com'
      ];
      
      issues.forEach(issue => {
        if (issue.fields.assignee) {
          const email = issue.fields.assignee.emailAddress;
          
          // Filtruj tylko znanych członków zespołu Pixels
          if (email && knownPixelsMembers.includes(email.toLowerCase())) {
            // Pobierz rolę z Project Roles API lub użyj fallback
            let role: string | undefined;
            
            if (userRoleMap && userRoleMap.has(email)) {
              role = userRoleMap.get(email);
              console.log(`[fetchPixelsTeamUsers] Found project role for ${email}: ${role}`);
            } else {
              // Fallback do starej metody
              role = this.extractUserRole(issue, email);
              if (!role) {
                console.log(`[fetchPixelsTeamUsers] No project role found for ${email}, using fallback mapping`);
              }
            }
            
            const user: JiraUser = {
              accountId: issue.fields.assignee.accountId,
              displayName: issue.fields.assignee.displayName,
              emailAddress: email,
              active: true,
              role: role
            };
            usersMap.set(user.accountId, user);
          }
        }
      });
      
      const users = Array.from(usersMap.values());
      console.log(`[fetchPixelsTeamUsers] Found ${users.length} Pixels team members (filtered from known list)`);
      
      return users;
    } catch (error) {
      console.error('Error fetching Pixels team users:', error);
      throw new Error('Failed to fetch team users from Jira');
    }
  }

  // Pomocnicza funkcja do wyciągania roli użytkownika z różnych źródeł w Jira
  private extractUserRole(issue: JiraIssue, userEmail: string): string | undefined {
    // Sprawdź czy w zadaniu są jakieś custom fields związane z rolą
    // Możliwe nazwy pól: Role, Position, Job Title, Team Role, etc.
    
    // Sprawdź custom fields (mogą być różne numery w zależności od konfiguracji Jira)
    const fields = issue.fields as any;
    
    // Sprawdź popularne nazwy pól dla ról
    const possibleRoleFields = [
      'customfield_10010', // Przykładowe custom field ID
      'customfield_10011',
      'customfield_10012',
      'customfield_10020',
      'Role',
      'Position',
      'Job Title',
      'Team Role',
      'Developer Role',
      'User Role'
    ];
    
    for (const fieldName of possibleRoleFields) {
      if (fields[fieldName]) {
        const fieldValue = fields[fieldName];
        // Jeśli to string, zwróć bezpośrednio
        if (typeof fieldValue === 'string' && fieldValue.trim()) {
          console.log(`[extractUserRole] Found role in field ${fieldName}: ${fieldValue}`);
          return fieldValue.trim();
        }
        // Jeśli to obiekt z value lub name
        if (typeof fieldValue === 'object' && fieldValue.value) {
          console.log(`[extractUserRole] Found role in field ${fieldName}.value: ${fieldValue.value}`);
          return fieldValue.value;
        }
        if (typeof fieldValue === 'object' && fieldValue.name) {
          console.log(`[extractUserRole] Found role in field ${fieldName}.name: ${fieldValue.name}`);
          return fieldValue.name;
        }
      }
    }
    
    // Jeśli nie znaleziono roli w polach, spróbuj wyciągnąć z opisu zadania
    if (fields.description && typeof fields.description === 'string') {
      const roleMatch = fields.description.match(/role:\s*([^\n\r,]+)/i);
      if (roleMatch) {
        console.log(`[extractUserRole] Found role in description: ${roleMatch[1].trim()}`);
        return roleMatch[1].trim();
      }
    }
    
    console.log(`[extractUserRole] No role found for user ${userEmail}`);
    return undefined;
  }
}

// Factory function to create Jira client with environment variables
export const createJiraClient = (): JiraClient => {
  const env = import.meta.env;
  const config: JiraClientConfig = {
    domain: env.VITE_JIRA_DOMAIN || '',
    email: env.VITE_JIRA_EMAIL || '',
    apiToken: env.VITE_JIRA_API_TOKEN || '',
    projectKey: env.VITE_JIRA_PROJECT_KEY || ''
  };

  if (!config.domain || !config.email || !config.apiToken || !config.projectKey) {
    throw new Error('Missing Jira configuration. Please check your environment variables.');
  }

  return new JiraClient(config);
};

export default JiraClient;
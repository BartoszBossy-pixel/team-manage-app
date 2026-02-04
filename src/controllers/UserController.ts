import { generateUserColor } from '../utils/avatarUtils';
import { createJiraClient } from '../api/jiraClient';
import { getUserRepository, UserRepository } from '../database/userRepository';
import { ApiUserRepository } from '../database/apiUserRepository';

export interface User {
  id: string;
  displayName: string;
  email?: string;
  role?: string;
  customColor?: string;
  lastUpdated: number;
}

export interface UserData {
  users: User[];
  lastSync: number;
}

class UserController {
  private static instance: UserController;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 godziny w ms
  private repository: UserRepository | null = null;

  private constructor() {}

  // Inicjalizuj repository z hierarchią fallback: API → Direct DynamoDB → localStorage
  private async getRepository(): Promise<UserRepository> {
    if (!this.repository) {
      console.log('[UserController] Initializing repository with fallback hierarchy...');
      
      // 1. Spróbuj API repository (frontend → backend → DynamoDB)
      try {
        const apiRepo = new ApiUserRepository();
        if (await apiRepo.isAvailable()) {
          console.log('[UserController] Using API repository (frontend → backend → DynamoDB)');
          this.repository = apiRepo;
          return this.repository;
        }
      } catch (error) {
        console.warn('[UserController] API repository not available:', error.message);
      }
      
      // 2. Fallback do direct DynamoDB lub localStorage
      console.log('[UserController] Falling back to direct repository');
      this.repository = await getUserRepository();
    }
    return this.repository;
  }

  static getInstance(): UserController {
    if (!UserController.instance) {
      UserController.instance = new UserController();
    }
    return UserController.instance;
  }

  // Pobierz wszystkich użytkowników z bazy danych
  async getUsers(): Promise<User[]> {
    try {
      const repository = await this.getRepository();
      return await repository.getUsers();
    } catch (error) {
      console.error('[UserController] Error loading users:', error);
      return [];
    }
  }

  // Zapisz użytkowników do bazy danych
  async saveUsers(users: User[]): Promise<void> {
    try {
      const repository = await this.getRepository();
      await repository.saveUsers(users);
    } catch (error) {
      console.error('[UserController] Error saving users:', error);
      throw error;
    }
  }

  // Pobierz konkretnego użytkownika po ID
  async getUserById(id: string): Promise<User | undefined> {
    try {
      const repository = await this.getRepository();
      return await repository.getUserById(id);
    } catch (error) {
      console.error('[UserController] Error getting user by ID:', error);
      return undefined;
    }
  }

  // Pobierz użytkownika po emailu
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const users = await this.getUsers();
      return users.find(user => user.email?.toLowerCase() === email.toLowerCase());
    } catch (error) {
      console.error('[UserController] Error getting user by email:', error);
      return undefined;
    }
  }

  // Zaktualizuj użytkownika
  async updateUser(updatedUser: Partial<User> & { id: string }): Promise<User | null> {
    try {
      const repository = await this.getRepository();
      const existingUser = await repository.getUserById(updatedUser.id);
      
      if (!existingUser) {
        console.warn(`[UserController] User with ID ${updatedUser.id} not found`);
        return null;
      }

      const user = {
        ...existingUser,
        ...updatedUser,
        lastUpdated: Date.now()
      };

      const updatedUserResult = await repository.updateUser(user);
      console.log(`[UserController] Updated user: ${user.displayName}`);
      return updatedUserResult;
    } catch (error) {
      console.error('[UserController] Error updating user:', error);
      return null;
    }
  }

  // Dodaj lub zaktualizuj użytkownika
  async upsertUser(user: Omit<User, 'lastUpdated'>): Promise<User> {
    try {
      const repository = await this.getRepository();
      const existingUser = await repository.getUserById(user.id);
      
      const userWithTimestamp: User = {
        ...user,
        lastUpdated: Date.now()
      };

      if (existingUser) {
        // Zachowaj customColor jeśli już istnieje
        userWithTimestamp.customColor = userWithTimestamp.customColor || existingUser.customColor;
        console.log(`[UserController] Updated existing user: ${user.displayName}`);
      } else {
        console.log(`[UserController] Added new user: ${user.displayName}`);
      }

      return await repository.updateUser(userWithTimestamp);
    } catch (error) {
      console.error('[UserController] Error upserting user:', error);
      throw error;
    }
  }

  // Synchronizuj użytkowników z Jira (merge z bazą danych)
  async syncUsersFromJira(jiraUsers: Array<{
    accountId: string;
    displayName: string;
    emailAddress: string;
    role?: string;
  }>): Promise<User[]> {
    console.log(`[UserController] Syncing ${jiraUsers.length} users from Jira`);
    
    try {
      const existingUsers = await this.getUsers();
      const syncedUsers: User[] = [];

      for (const jiraUser of jiraUsers) {
        const existingUser = existingUsers.find(u => u.id === jiraUser.accountId || u.email === jiraUser.emailAddress);
        
        const user: User = {
          id: jiraUser.accountId,
          displayName: jiraUser.displayName,
          email: jiraUser.emailAddress,
          role: jiraUser.role,
          customColor: existingUser?.customColor, // Zachowaj niestandardowy kolor
          lastUpdated: Date.now()
        };

        syncedUsers.push(user);
      }

      await this.saveUsers(syncedUsers);
      console.log(`[UserController] Synced ${syncedUsers.length} users`);
      return syncedUsers;
    } catch (error) {
      console.error('[UserController] Error syncing users from Jira:', error);
      throw error;
    }
  }

  // Sprawdź czy dane są aktualne (uproszczona wersja - zawsze odśwież z Jira)
  async isDataFresh(): Promise<boolean> {
    try {
      const users = await this.getUsers();
      if (users.length === 0) return false;
      
      // Sprawdź czy najnowszy użytkownik nie jest starszy niż CACHE_DURATION
      const newestUser = users.reduce((newest, user) =>
        user.lastUpdated > newest.lastUpdated ? user : newest
      );
      
      const age = Date.now() - newestUser.lastUpdated;
      const isFresh = age < this.CACHE_DURATION;
      
      console.log(`[UserController] Data age: ${Math.round(age / 1000 / 60)} minutes, fresh: ${isFresh}`);
      return isFresh;
    } catch (error) {
      console.error('[UserController] Error checking data freshness:', error);
      return false;
    }
  }

  // Wyczyść dane użytkowników
  async clearUsers(): Promise<void> {
    try {
      await this.saveUsers([]);
      console.log('[UserController] Cleared all user data');
    } catch (error) {
      console.error('[UserController] Error clearing users:', error);
      throw error;
    }
  }

  // Pobierz kolor użytkownika (niestandardowy lub wygenerowany)
  getUserColor(user: User): string {
    return user.customColor || generateUserColor(user.displayName);
  }

  // Ustaw niestandardowy kolor użytkownika
  async setUserColor(userId: string, color: string | undefined): Promise<User | null> {
    return await this.updateUser({ id: userId, customColor: color });
  }

  // Pobierz statystyki użytkowników
  async getUserStats(): Promise<{
    totalUsers: number;
    usersWithCustomColors: number;
    lastSync: Date | null;
    dataAge: string;
  }> {
    try {
      const users = await this.getUsers();
      let lastSync: Date | null = null;
      let dataAge = 'Unknown';

      if (users.length > 0) {
        const newestUser = users.reduce((newest, user) =>
          user.lastUpdated > newest.lastUpdated ? user : newest
        );
        lastSync = new Date(newestUser.lastUpdated);
        const ageMs = Date.now() - newestUser.lastUpdated;
        const ageMinutes = Math.round(ageMs / 1000 / 60);
        dataAge = ageMinutes < 60 ? `${ageMinutes} min` : `${Math.round(ageMinutes / 60)} h`;
      }

      return {
        totalUsers: users.length,
        usersWithCustomColors: users.filter(u => u.customColor).length,
        lastSync,
        dataAge
      };
    } catch (error) {
      console.error('[UserController] Error getting user stats:', error);
      return {
        totalUsers: 0,
        usersWithCustomColors: 0,
        lastSync: null,
        dataAge: 'Error'
      };
    }
  }

  // Odśwież dane użytkowników z Jira
  async refreshFromJira(): Promise<User[]> {
    console.log('[UserController] Refreshing users from Jira...');
    
    try {
      const jiraClient = createJiraClient();
      const jiraUsers = await jiraClient.fetchPixelsTeamUsers();
      
      // Przygotuj dane do synchronizacji
      const jiraUsersWithRoles = jiraUsers.map(jiraUser => ({
        accountId: jiraUser.accountId,
        displayName: jiraUser.displayName,
        emailAddress: jiraUser.emailAddress,
        role: jiraUser.role || this.getRoleFromName(jiraUser.displayName)
      }));
      
      // Synchronizuj z bazą danych (zachowuje niestandardowe kolory)
      const syncedUsers = await this.syncUsersFromJira(jiraUsersWithRoles);
      
      console.log(`[UserController] Successfully refreshed ${syncedUsers.length} users from Jira`);
      return syncedUsers;
    } catch (error) {
      console.error('[UserController] Error refreshing users from Jira:', error);
      throw error;
    }
  }

  // Funkcja przypisująca role na podstawie rzeczywistych członków zespołu Pixels
  private getRoleFromName(displayName: string): string {
    const name = displayName.toLowerCase();
    
    // Mapowanie na podstawie rzeczywistych członków zespołu Pixels - role z zmiennych środowiskowych
    if (name.includes('tomasz') && name.includes('rusiński'))
      return import.meta.env.VITE_ROLE_TOMASZ_RUSINSKI || 'Software Engineer';
    if (name.includes('bartosz') && name.includes('bossy'))
      return import.meta.env.VITE_ROLE_BARTOSZ_BOSSY || 'Associate Manager, Engineering';
    if (name.includes('oliwer') && name.includes('pawelski'))
      return import.meta.env.VITE_ROLE_OLIWER_PAWELSKI || 'Associate Software Engineer';
    if (name.includes('krzysztof') && name.includes('rak'))
      return import.meta.env.VITE_ROLE_KRZYSZTOF_RAK || 'Associate Software Engineer';
    if (name.includes('krzysztof') && name.includes('adamek'))
      return import.meta.env.VITE_ROLE_KRZYSZTOF_ADAMEK || 'Senior Software Engineer';
    if (name.includes('alicja') && name.includes('wolnik'))
      return import.meta.env.VITE_ROLE_ALICJA_WOLNIK || 'Senior Software Engineer';
    
    return 'Developer'; // Domyślna rola
  }
}

export default UserController;
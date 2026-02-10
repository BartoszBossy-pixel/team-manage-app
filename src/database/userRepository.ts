import { GetCommand, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAMES, isDynamoDBAvailable } from './dynamoClient';
import { User, UserData } from '../controllers/UserController';

export interface UserRepository {
  getUsers(): Promise<User[]>;
  saveUsers(users: User[]): Promise<void>;
  getUserById(id: string): Promise<User | undefined>;
  updateUser(user: User): Promise<User>;
  deleteUser(id: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}

// DynamoDB Repository Implementation
class DynamoUserRepository implements UserRepository {
  async isAvailable(): Promise<boolean> {
    return await isDynamoDBAvailable();
  }

  async getUsers(): Promise<User[]> {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAMES.USERS,
      });

      const result = await dynamoClient.send(command);
      const users = result.Items as User[] || [];
      
      console.log(`[DynamoDB] Loaded ${users.length} users from DynamoDB`);
      return users;
    } catch (error) {
      console.error('[DynamoDB] Error loading users:', error);
      throw error;
    }
  }

  async saveUsers(users: User[]): Promise<void> {
    try {
      // Zapisz każdego użytkownika osobno (batch write można dodać później)
      const promises = users.map(user => this.updateUser(user));
      await Promise.all(promises);
      
      console.log(`[DynamoDB] Saved ${users.length} users to DynamoDB`);
    } catch (error) {
      console.error('[DynamoDB] Error saving users:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    try {
      const command = new GetCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { id }
      });

      const result = await dynamoClient.send(command);
      return result.Item as User;
    } catch (error) {
      console.error('[DynamoDB] Error getting user by ID:', error);
      throw error;
    }
  }

  async updateUser(user: User): Promise<User> {
    try {
      const command = new PutCommand({
        TableName: TABLE_NAMES.USERS,
        Item: {
          ...user,
          lastUpdated: Date.now()
        }
      });

      await dynamoClient.send(command);
      console.log(`[DynamoDB] Updated user: ${user.displayName}`);
      return user;
    } catch (error) {
      console.error('[DynamoDB] Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: TABLE_NAMES.USERS,
        Key: { id }
      });

      await dynamoClient.send(command);
      console.log(`[DynamoDB] Deleted user with ID: ${id}`);
    } catch (error) {
      console.error('[DynamoDB] Error deleting user:', error);
      throw error;
    }
  }
}

// LocalStorage Repository Implementation (fallback)
class LocalStorageUserRepository implements UserRepository {
  private readonly STORAGE_KEY = 'kpi-dashboard-users';

  async isAvailable(): Promise<boolean> {
    return typeof localStorage !== 'undefined';
  }

  async getUsers(): Promise<User[]> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        console.log('[LocalStorage] No users found in localStorage');
        return [];
      }

      const userData: UserData = JSON.parse(data);
      console.log(`[LocalStorage] Loaded ${userData.users.length} users from localStorage`);
      return userData.users;
    } catch (error) {
      console.error('[LocalStorage] Error loading users:', error);
      return [];
    }
  }

  async saveUsers(users: User[]): Promise<void> {
    try {
      const userData: UserData = {
        users: users.map(user => ({
          ...user,
          lastUpdated: Date.now()
        })),
        lastSync: Date.now()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userData));
      console.log(`[LocalStorage] Saved ${users.length} users to localStorage`);
    } catch (error) {
      console.error('[LocalStorage] Error saving users:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(user => user.id === id);
  }

  async updateUser(user: User): Promise<User> {
    const users = await this.getUsers();
    const userIndex = users.findIndex(u => u.id === user.id);
    
    const updatedUser = {
      ...user,
      lastUpdated: Date.now()
    };

    if (userIndex >= 0) {
      users[userIndex] = updatedUser;
    } else {
      users.push(updatedUser);
    }

    await this.saveUsers(users);
    console.log(`[LocalStorage] Updated user: ${user.displayName}`);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const users = await this.getUsers();
    const filteredUsers = users.filter(user => user.id !== id);
    await this.saveUsers(filteredUsers);
    console.log(`[LocalStorage] Deleted user with ID: ${id}`);
  }
}

// Factory function to create appropriate repository
export const createUserRepository = async (): Promise<UserRepository> => {
  const dynamoRepo = new DynamoUserRepository();
  
  if (await dynamoRepo.isAvailable()) {
    console.log('[Repository] Using DynamoDB repository');
    return dynamoRepo;
  } else {
    console.log('[Repository] Using LocalStorage repository (fallback)');
    return new LocalStorageUserRepository();
  }
};

// Singleton instance
let repositoryInstance: UserRepository | null = null;

export const getUserRepository = async (): Promise<UserRepository> => {
  if (!repositoryInstance) {
    repositoryInstance = await createUserRepository();
  }
  return repositoryInstance;
};
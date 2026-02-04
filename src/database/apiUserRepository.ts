import { User } from '../controllers/UserController';
import { UserRepository } from './userRepository';

export class ApiUserRepository implements UserRepository {
  private readonly baseUrl = 'http://localhost:3001/api';

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users`);
      return response.ok;
    } catch (error) {
      console.error('[ApiUserRepository] Error checking availability:', error);
      return false;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      console.log('[ApiUserRepository] Getting all users from API');
      const response = await fetch(`${this.baseUrl}/users`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`[ApiUserRepository] Retrieved ${data.users.length} users from API`);
        return data.users;
      } else {
        throw new Error(data.error || 'Failed to get users');
      }
    } catch (error) {
      console.error('[ApiUserRepository] Error getting users:', error);
      throw error;
    }
  }

  async saveUsers(users: User[]): Promise<void> {
    try {
      console.log(`[ApiUserRepository] Saving ${users.length} users to API`);
      const response = await fetch(`${this.baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save users');
      }
      
      console.log(`[ApiUserRepository] Successfully saved ${users.length} users to API`);
    } catch (error) {
      console.error('[ApiUserRepository] Error saving users:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    try {
      console.log(`[ApiUserRepository] Getting user ${id} from API`);
      const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(id)}`);
      
      if (response.status === 404) {
        console.log(`[ApiUserRepository] User ${id} not found`);
        return undefined;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`[ApiUserRepository] Found user: ${data.user.displayName}`);
        return data.user;
      } else {
        throw new Error(data.error || 'Failed to get user');
      }
    } catch (error) {
      console.error('[ApiUserRepository] Error getting user by ID:', error);
      throw error;
    }
  }

  async updateUser(user: User): Promise<User> {
    try {
      console.log(`[ApiUserRepository] Updating user ${user.id} via API`);
      const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(user.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`[ApiUserRepository] Successfully updated user: ${data.user.displayName}`);
        return data.user;
      } else {
        throw new Error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('[ApiUserRepository] Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      console.log(`[ApiUserRepository] Deleting user ${id} via API`);
      const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete user');
      }
      
      console.log(`[ApiUserRepository] Successfully deleted user ${id}`);
    } catch (error) {
      console.error('[ApiUserRepository] Error deleting user:', error);
      throw error;
    }
  }
}
import { TableSettings, TableType } from '../types/tableSettings';
import { TableSettingsRepository } from './tableSettingsRepository';

// API Repository Implementation - używa serwera jako proxy do DynamoDB
class ApiTableSettingsRepository implements TableSettingsRepository {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.warn('[API] Server not available:', error);
      return false;
    }
  }

  async getTableSettings(tableType: TableType, userId?: string): Promise<TableSettings | undefined> {
    try {
      const url = new URL(`${this.baseUrl}/api/table-settings/${tableType}`);
      if (userId) {
        url.searchParams.set('userId', userId);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.settings) {
        console.log(`[API] Loaded table settings for ${tableType}`);
        return data.settings as TableSettings;
      }
      
      return undefined;
    } catch (error) {
      console.error('[API] Error loading table settings:', error);
      throw error;
    }
  }

  async saveTableSettings(settings: TableSettings): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/table-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log(`[API] Saved table settings for ${settings.id} to DynamoDB via API`);
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('[API] Error saving table settings:', error);
      throw error;
    }
  }

  async deleteTableSettings(tableType: TableType, userId?: string): Promise<void> {
    try {
      const url = new URL(`${this.baseUrl}/api/table-settings/${tableType}`);
      if (userId) {
        url.searchParams.set('userId', userId);
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`[API] Deleted table settings for ${tableType}`);
    } catch (error) {
      console.error('[API] Error deleting table settings:', error);
      throw error;
    }
  }
}

// Factory function to create API repository
export const createApiTableSettingsRepository = async (): Promise<TableSettingsRepository> => {
  const apiRepo = new ApiTableSettingsRepository();
  
  if (await apiRepo.isAvailable()) {
    console.log('[TableSettingsRepository] Using API repository (DynamoDB via server)');
    return apiRepo;
  }
  
  throw new Error('API server not available');
};

export default ApiTableSettingsRepository;
import { GetCommand, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, TABLE_NAMES, isDynamoDBAvailable } from './dynamoClient';
import { TableSettings, TableSettingsData, TableType } from '../types/tableSettings';

export interface TableSettingsRepository {
  getTableSettings(tableType: TableType, userId?: string): Promise<TableSettings | undefined>;
  saveTableSettings(settings: TableSettings): Promise<void>;
  deleteTableSettings(tableType: TableType, userId?: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}

// DynamoDB Repository Implementation
class DynamoTableSettingsRepository implements TableSettingsRepository {
  async isAvailable(): Promise<boolean> {
    return await isDynamoDBAvailable();
  }

  async getTableSettings(tableType: TableType, userId?: string): Promise<TableSettings | undefined> {
    try {
      const settingsId = userId ? `${tableType}-${userId}` : tableType;
      
      const command = new GetCommand({
        TableName: TABLE_NAMES.USER_SETTINGS,
        Key: {
          id: userId ? `${tableType}-${userId}` : tableType
        }
      });

      const result = await dynamoClient.send(command);
      
      if (result.Item) {
        console.log(`[DynamoDB] Loaded table settings for ${tableType}`);
        // Usuń id z wyniku i zwróć jako TableSettings
        const { id, ...settings } = result.Item;
        return settings as TableSettings;
      }
      
      return undefined;
    } catch (error) {
      console.error('[DynamoDB] Error loading table settings:', error);
      throw error;
    }
  }

  async saveTableSettings(settings: TableSettings): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: TABLE_NAMES.USER_SETTINGS,
        Item: {
          id: settings.userId ? `${settings.id}-${settings.userId}` : settings.id,
          ...settings,
          lastUpdated: Date.now()
        }
      });

      await dynamoClient.send(command);
      console.log(`[DynamoDB] Saved table settings for ${settings.id}`);
    } catch (error) {
      console.error('[DynamoDB] Error saving table settings:', error);
      throw error;
    }
  }

  async deleteTableSettings(tableType: TableType, userId?: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: TABLE_NAMES.USER_SETTINGS,
        Key: {
          id: userId ? `${tableType}-${userId}` : tableType
        }
      });

      await dynamoClient.send(command);
      console.log(`[DynamoDB] Deleted table settings for ${tableType}`);
    } catch (error) {
      console.error('[DynamoDB] Error deleting table settings:', error);
      throw error;
    }
  }
}

// LocalStorage Repository Implementation
class LocalStorageTableSettingsRepository implements TableSettingsRepository {
  private getStorageKey(tableType: TableType, userId?: string): string {
    return userId 
      ? `kpi-dashboard-table-settings-${tableType}-${userId}`
      : `kpi-dashboard-table-settings-${tableType}`;
  }

  async isAvailable(): Promise<boolean> {
    return typeof localStorage !== 'undefined';
  }

  async getTableSettings(tableType: TableType, userId?: string): Promise<TableSettings | undefined> {
    try {
      const storageKey = this.getStorageKey(tableType, userId);
      const data = localStorage.getItem(storageKey);
      
      if (!data) {
        console.log(`[LocalStorage] No table settings found for ${tableType}`);
        return undefined;
      }

      const settings = JSON.parse(data) as TableSettings;
      console.log(`[LocalStorage] Loaded table settings for ${tableType}`);
      return settings;
    } catch (error) {
      console.error('[LocalStorage] Error loading table settings:', error);
      return undefined;
    }
  }

  async saveTableSettings(settings: TableSettings): Promise<void> {
    try {
      const storageKey = this.getStorageKey(settings.id as TableType, settings.userId);
      const settingsWithTimestamp = {
        ...settings,
        lastUpdated: Date.now()
      };

      localStorage.setItem(storageKey, JSON.stringify(settingsWithTimestamp));
      console.log(`[LocalStorage] Saved table settings for ${settings.id}`);
    } catch (error) {
      console.error('[LocalStorage] Error saving table settings:', error);
      throw error;
    }
  }

  async deleteTableSettings(tableType: TableType, userId?: string): Promise<void> {
    try {
      const storageKey = this.getStorageKey(tableType, userId);
      localStorage.removeItem(storageKey);
      console.log(`[LocalStorage] Deleted table settings for ${tableType}`);
    } catch (error) {
      console.error('[LocalStorage] Error deleting table settings:', error);
      throw error;
    }
  }
}

// Factory function to create appropriate repository
export const createTableSettingsRepository = async (preferDynamoDB: boolean = false): Promise<TableSettingsRepository> => {
  if (preferDynamoDB) {
    const dynamoRepo = new DynamoTableSettingsRepository();
    
    if (await dynamoRepo.isAvailable()) {
      console.log('[TableSettingsRepository] Using DynamoDB repository');
      return dynamoRepo;
    }
  }
  
  console.log('[TableSettingsRepository] Using LocalStorage repository');
  return new LocalStorageTableSettingsRepository();
};

// Singleton instances for different storage types
let dynamoRepositoryInstance: TableSettingsRepository | null = null;
let localStorageRepositoryInstance: TableSettingsRepository | null = null;

export const getDynamoTableSettingsRepository = async (): Promise<TableSettingsRepository> => {
  if (!dynamoRepositoryInstance) {
    dynamoRepositoryInstance = await createTableSettingsRepository(true);
  }
  return dynamoRepositoryInstance;
};

export const getLocalStorageTableSettingsRepository = async (): Promise<TableSettingsRepository> => {
  if (!localStorageRepositoryInstance) {
    localStorageRepositoryInstance = await createTableSettingsRepository(false);
  }
  return localStorageRepositoryInstance;
};
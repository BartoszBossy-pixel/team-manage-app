import { 
  TableSettings, 
  TableType, 
  TABLE_STORAGE_CONFIG, 
  DEFAULT_TABLE_SETTINGS,
  ColumnSettings,
  FilterSettings,
  SortSettings
} from '../types/tableSettings';
import {
  getDynamoTableSettingsRepository,
  getLocalStorageTableSettingsRepository,
  TableSettingsRepository
} from '../database/tableSettingsRepository';
import { createApiTableSettingsRepository } from '../database/apiTableSettingsRepository';

class TableSettingsController {
  private static instance: TableSettingsController;
  private apiRepository: TableSettingsRepository | null = null;
  private dynamoRepository: TableSettingsRepository | null = null;
  private localStorageRepository: TableSettingsRepository | null = null;

  private constructor() {}

  static getInstance(): TableSettingsController {
    if (!TableSettingsController.instance) {
      TableSettingsController.instance = new TableSettingsController();
    }
    return TableSettingsController.instance;
  }

  // Pobierz odpowiedni repository na podstawie typu tabeli
  private async getRepository(tableType: TableType): Promise<TableSettingsRepository> {
    console.log(`[TableSettingsController] getRepository called with tableType: "${tableType}"`);
    console.log(`[TableSettingsController] Available configs:`, Object.keys(TABLE_STORAGE_CONFIG));
    
    const config = TABLE_STORAGE_CONFIG[tableType];
    
    if (!config) {
      console.error(`[TableSettingsController] No config found for tableType: "${tableType}"`);
      console.error(`[TableSettingsController] Available tableTypes:`, Object.keys(TABLE_STORAGE_CONFIG));
      throw new Error(`Unknown table type: ${tableType}`);
    }
    
    if (config.storageType === 'dynamodb') {
      try {
        // Najpierw spróbuj API repository (DynamoDB przez serwer)
        if (!this.apiRepository) {
          console.log(`[TableSettingsController] Attempting to use API repository for ${tableType}`);
          try {
            this.apiRepository = await createApiTableSettingsRepository();
            console.log(`[TableSettingsController] API repository created successfully for ${tableType}`);
          } catch (apiError) {
            console.warn(`[TableSettingsController] Failed to create API repository for ${tableType}:`, apiError);
            throw apiError; // Re-throw to go to outer catch
          }
        }
        
        if (await this.apiRepository.isAvailable()) {
          console.log(`[TableSettingsController] Using API repository for ${tableType}`);
          return this.apiRepository;
        } else {
          console.warn(`[TableSettingsController] API not available for ${tableType}, trying direct DynamoDB`);
        }
      } catch (error) {
        console.warn(`[TableSettingsController] API error for ${tableType}, trying direct DynamoDB:`, error);
        this.apiRepository = null; // Reset to try again later
      }

      // Fallback na bezpośrednie DynamoDB
      try {
        if (!this.dynamoRepository) {
          this.dynamoRepository = await getDynamoTableSettingsRepository();
        }
        
        if (await this.dynamoRepository.isAvailable()) {
          console.log(`[TableSettingsController] Using direct DynamoDB repository for ${tableType}`);
          return this.dynamoRepository;
        } else {
          console.warn(`[TableSettingsController] DynamoDB not available for ${tableType}, falling back to localStorage`);
        }
      } catch (error) {
        console.warn(`[TableSettingsController] DynamoDB error for ${tableType}, falling back to localStorage:`, error);
      }
    }
    
    // Fallback na localStorage
    if (!this.localStorageRepository) {
      this.localStorageRepository = await getLocalStorageTableSettingsRepository();
    }
    console.log(`[TableSettingsController] Using localStorage repository for ${tableType}`);
    return this.localStorageRepository;
  }

  // Pobierz ustawienia tabeli
  async getTableSettings(tableType: TableType, userId?: string): Promise<TableSettings> {
    try {
      const repository = await this.getRepository(tableType);
      const config = TABLE_STORAGE_CONFIG[tableType];
      
      // Dla globalnych ustawień nie używamy userId
      const effectiveUserId = config.isGlobal ? undefined : userId;
      
      const settings = await repository.getTableSettings(tableType, effectiveUserId);
      
      if (settings) {
        console.log(`[TableSettingsController] Loaded settings for ${tableType}`);
        return settings;
      }
      
      // Zwróć domyślne ustawienia jeśli nie ma zapisanych
      const defaultSettings = this.createDefaultSettings(tableType, effectiveUserId);
      console.log(`[TableSettingsController] Using default settings for ${tableType}`);
      return defaultSettings;
      
    } catch (error) {
      console.error(`[TableSettingsController] Error loading settings for ${tableType}:`, error);
      return this.createDefaultSettings(tableType, userId);
    }
  }

  // Zapisz ustawienia tabeli
  async saveTableSettings(settings: TableSettings): Promise<void> {
    try {
      console.log(`[TableSettingsController] saveTableSettings called with settings:`, settings);
      const tableType = settings.id as TableType;
      
      if (!tableType) {
        console.error(`[TableSettingsController] Invalid tableType from settings.id:`, settings.id);
        throw new Error(`Invalid table type: ${settings.id}`);
      }
      
      console.log(`[TableSettingsController] Using tableType: "${tableType}"`);
      const repository = await this.getRepository(tableType);
      const config = TABLE_STORAGE_CONFIG[tableType];
      
      // Dla globalnych ustawień nie używamy userId
      const effectiveUserId = config.isGlobal ? undefined : settings.userId;
      
      const settingsToSave: TableSettings = {
        ...settings,
        userId: effectiveUserId,
        lastUpdated: Date.now()
      };
      
      await repository.saveTableSettings(settingsToSave);
      console.log(`[TableSettingsController] Saved settings for ${tableType}`);
      
    } catch (error) {
      console.error(`[TableSettingsController] Error saving settings for ${settings.id}:`, error);
      throw error;
    }
  }

  // Aktualizuj kolumny
  async updateColumns(tableType: TableType, columns: ColumnSettings[], userId?: string): Promise<void> {
    const settings = await this.getTableSettings(tableType, userId);
    
    // Upewnij się, że settings mają prawidłowe id
    if (!settings.id) {
      console.warn(`[TableSettingsController] Settings missing id, setting to tableType: ${tableType}`);
      settings.id = tableType;
    }
    
    settings.columns = columns;
    await this.saveTableSettings(settings);
  }

  // Aktualizuj filtry
  async updateFilters(tableType: TableType, filters: FilterSettings, userId?: string): Promise<void> {
    console.log(`[TableSettingsController] updateFilters called for ${tableType}:`, filters);
    const settings = await this.getTableSettings(tableType, userId);
    console.log(`[TableSettingsController] Current settings for ${tableType}:`, settings);
    
    // Upewnij się, że settings mają prawidłowe id
    if (!settings.id) {
      console.warn(`[TableSettingsController] Settings missing id, setting to tableType: ${tableType}`);
      settings.id = tableType;
    }
    
    settings.filters = filters;
    console.log(`[TableSettingsController] Updated settings for ${tableType}:`, settings);
    await this.saveTableSettings(settings);
    console.log(`[TableSettingsController] Settings saved for ${tableType}`);
  }

  // Aktualizuj sortowanie
  async updateSort(tableType: TableType, sort: SortSettings, userId?: string): Promise<void> {
    const settings = await this.getTableSettings(tableType, userId);
    
    // Upewnij się, że settings mają prawidłowe id
    if (!settings.id) {
      console.warn(`[TableSettingsController] Settings missing id, setting to tableType: ${tableType}`);
      settings.id = tableType;
    }
    
    settings.sort = sort;
    await this.saveTableSettings(settings);
  }

  // Aktualizuj rozmiar strony
  async updatePageSize(tableType: TableType, pageSize: number, userId?: string): Promise<void> {
    const settings = await this.getTableSettings(tableType, userId);
    
    // Upewnij się, że settings mają prawidłowe id
    if (!settings.id) {
      console.warn(`[TableSettingsController] Settings missing id, setting to tableType: ${tableType}`);
      settings.id = tableType;
    }
    
    settings.pageSize = pageSize;
    await this.saveTableSettings(settings);
  }

  // Aktualizuj szerokość kolumny
  async updateColumnWidth(tableType: TableType, columnKey: string, width: number, userId?: string): Promise<void> {
    const settings = await this.getTableSettings(tableType, userId);
    
    // Upewnij się, że settings mają prawidłowe id
    if (!settings.id) {
      console.warn(`[TableSettingsController] Settings missing id, setting to tableType: ${tableType}`);
      settings.id = tableType;
    }
    
    const column = settings.columns.find(col => col.key === columnKey);
    
    if (column) {
      column.width = width;
      await this.saveTableSettings(settings);
      console.log(`[TableSettingsController] Updated column width for ${columnKey}: ${width}px`);
    }
  }

  // Przełącz widoczność kolumny
  async toggleColumnVisibility(tableType: TableType, columnKey: string, userId?: string): Promise<void> {
    const settings = await this.getTableSettings(tableType, userId);
    
    // Upewnij się, że settings mają prawidłowe id
    if (!settings.id) {
      console.warn(`[TableSettingsController] Settings missing id, setting to tableType: ${tableType}`);
      settings.id = tableType;
    }
    
    const column = settings.columns.find(col => col.key === columnKey);
    
    if (column) {
      column.visible = !column.visible;
      await this.saveTableSettings(settings);
      console.log(`[TableSettingsController] Toggled column visibility for ${columnKey}: ${column.visible}`);
    }
  }

  // Zmień kolejność kolumn
  async reorderColumns(tableType: TableType, columnKeys: string[], userId?: string): Promise<void> {
    const settings = await this.getTableSettings(tableType, userId);
    
    // Upewnij się, że settings mają prawidłowe id
    if (!settings.id) {
      console.warn(`[TableSettingsController] Settings missing id, setting to tableType: ${tableType}`);
      settings.id = tableType;
    }
    
    // Aktualizuj kolejność kolumn
    columnKeys.forEach((key, index) => {
      const column = settings.columns.find(col => col.key === key);
      if (column) {
        column.order = index;
      }
    });
    
    // Posortuj kolumny według nowej kolejności
    settings.columns.sort((a, b) => a.order - b.order);
    
    await this.saveTableSettings(settings);
    console.log(`[TableSettingsController] Reordered columns for ${tableType}`);
  }

  // Resetuj ustawienia do domyślnych
  async resetToDefaults(tableType: TableType, userId?: string): Promise<TableSettings> {
    try {
      const repository = await this.getRepository(tableType);
      const config = TABLE_STORAGE_CONFIG[tableType];
      const effectiveUserId = config.isGlobal ? undefined : userId;
      
      // Usuń istniejące ustawienia
      await repository.deleteTableSettings(tableType, effectiveUserId);
      
      // Zwróć domyślne ustawienia
      const defaultSettings = this.createDefaultSettings(tableType, effectiveUserId);
      await this.saveTableSettings(defaultSettings);
      
      console.log(`[TableSettingsController] Reset settings to defaults for ${tableType}`);
      return defaultSettings;
      
    } catch (error) {
      console.error(`[TableSettingsController] Error resetting settings for ${tableType}:`, error);
      throw error;
    }
  }

  // Pobierz informacje o konfiguracji storage dla tabeli
  getStorageConfig(tableType: TableType) {
    return TABLE_STORAGE_CONFIG[tableType];
  }

  // Sprawdź czy tabela używa globalnych ustawień
  isGlobalSettings(tableType: TableType): boolean {
    return TABLE_STORAGE_CONFIG[tableType].isGlobal;
  }

  // Utwórz domyślne ustawienia
  private createDefaultSettings(tableType: TableType, userId?: string): TableSettings {
    console.log(`[TableSettingsController] Creating default settings for tableType: "${tableType}"`);
    const defaultConfig = DEFAULT_TABLE_SETTINGS[tableType];
    
    if (!defaultConfig) {
      console.error(`[TableSettingsController] No default config found for tableType: "${tableType}"`);
      throw new Error(`No default configuration for table type: ${tableType}`);
    }
    
    const settings = {
      id: tableType,
      userId,
      columns: [...defaultConfig.columns],
      filters: { ...defaultConfig.filters },
      sort: { ...defaultConfig.sort },
      pageSize: defaultConfig.pageSize,
      lastUpdated: Date.now()
    };
    
    console.log(`[TableSettingsController] Created default settings:`, settings);
    return settings;
  }

  // Pobierz statystyki ustawień
  async getSettingsStats(): Promise<{
    globalTables: number;
    userTables: number;
    totalSettings: number;
  }> {
    const globalTables = Object.values(TABLE_STORAGE_CONFIG).filter(config => config.isGlobal).length;
    const userTables = Object.values(TABLE_STORAGE_CONFIG).filter(config => !config.isGlobal).length;
    
    return {
      globalTables,
      userTables,
      totalSettings: globalTables + userTables
    };
  }
}

export default TableSettingsController;
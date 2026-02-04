import { useState, useEffect, useCallback } from 'react';
import TableSettingsController from '../controllers/TableSettingsController';
import { 
  TableSettings, 
  TableType, 
  ColumnSettings, 
  FilterSettings, 
  SortSettings 
} from '../types/tableSettings';

export const useTableSettings = (tableType: TableType, userId?: string) => {
  const [settings, setSettings] = useState<TableSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const controller = TableSettingsController.getInstance();

  // Załaduj ustawienia przy pierwszym renderze
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const tableSettings = await controller.getTableSettings(tableType, userId);
        setSettings(tableSettings);
        
        console.log(`[useTableSettings] Loaded settings for ${tableType}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load table settings';
        setError(errorMessage);
        console.error(`[useTableSettings] Error loading settings for ${tableType}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [tableType, userId]);

  // Zapisz ustawienia
  const saveSettings = useCallback(async (newSettings: TableSettings) => {
    try {
      await controller.saveTableSettings(newSettings);
      setSettings(newSettings);
      console.log(`[useTableSettings] Saved settings for ${tableType}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save table settings';
      setError(errorMessage);
      console.error(`[useTableSettings] Error saving settings for ${tableType}:`, err);
      throw err;
    }
  }, [controller, tableType]);

  // Aktualizuj kolumny
  const updateColumns = useCallback(async (columns: ColumnSettings[]) => {
    try {
      await controller.updateColumns(tableType, columns, userId);
      if (settings) {
        const updatedSettings = { ...settings, columns };
        setSettings(updatedSettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update columns');
      throw err;
    }
  }, [controller, tableType, userId, settings]);

  // Aktualizuj filtry
  const updateFilters = useCallback(async (filters: FilterSettings) => {
    try {
      console.log(`[useTableSettings] Updating filters for ${tableType}:`, filters);
      await controller.updateFilters(tableType, filters, userId);
      if (settings) {
        const updatedSettings = { ...settings, filters };
        setSettings(updatedSettings);
        console.log(`[useTableSettings] Filters updated successfully for ${tableType}`);
      }
    } catch (err) {
      console.error(`[useTableSettings] Error updating filters for ${tableType}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to update filters');
      throw err;
    }
  }, [controller, tableType, userId, settings]);

  // Aktualizuj sortowanie
  const updateSort = useCallback(async (sort: SortSettings) => {
    try {
      await controller.updateSort(tableType, sort, userId);
      if (settings) {
        const updatedSettings = { ...settings, sort };
        setSettings(updatedSettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sort');
      throw err;
    }
  }, [controller, tableType, userId, settings]);

  // Aktualizuj rozmiar strony
  const updatePageSize = useCallback(async (pageSize: number) => {
    try {
      await controller.updatePageSize(tableType, pageSize, userId);
      if (settings) {
        const updatedSettings = { ...settings, pageSize };
        setSettings(updatedSettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update page size');
      throw err;
    }
  }, [controller, tableType, userId, settings]);

  // Aktualizuj szerokość kolumny
  const updateColumnWidth = useCallback(async (columnKey: string, width: number) => {
    try {
      await controller.updateColumnWidth(tableType, columnKey, width, userId);
      if (settings) {
        const updatedColumns = settings.columns.map(col => 
          col.key === columnKey ? { ...col, width } : col
        );
        const updatedSettings = { ...settings, columns: updatedColumns };
        setSettings(updatedSettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update column width');
      throw err;
    }
  }, [controller, tableType, userId, settings]);

  // Przełącz widoczność kolumny
  const toggleColumnVisibility = useCallback(async (columnKey: string) => {
    try {
      await controller.toggleColumnVisibility(tableType, columnKey, userId);
      if (settings) {
        const updatedColumns = settings.columns.map(col => 
          col.key === columnKey ? { ...col, visible: !col.visible } : col
        );
        const updatedSettings = { ...settings, columns: updatedColumns };
        setSettings(updatedSettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle column visibility');
      throw err;
    }
  }, [controller, tableType, userId, settings]);

  // Zmień kolejność kolumn
  const reorderColumns = useCallback(async (columnKeys: string[]) => {
    try {
      await controller.reorderColumns(tableType, columnKeys, userId);
      if (settings) {
        const reorderedColumns = columnKeys.map((key, index) => {
          const column = settings.columns.find(col => col.key === key);
          return column ? { ...column, order: index } : null;
        }).filter(Boolean) as ColumnSettings[];
        
        const updatedSettings = { ...settings, columns: reorderedColumns };
        setSettings(updatedSettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder columns');
      throw err;
    }
  }, [controller, tableType, userId, settings]);

  // Resetuj do domyślnych ustawień
  const resetToDefaults = useCallback(async () => {
    try {
      setLoading(true);
      const defaultSettings = await controller.resetToDefaults(tableType, userId);
      setSettings(defaultSettings);
      setError(null);
      console.log(`[useTableSettings] Reset to defaults for ${tableType}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset to defaults');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [controller, tableType, userId]);

  // Pobierz konfigurację storage - z obsługą błędów
  let storageConfig;
  let isGlobal;
  
  try {
    console.log(`[useTableSettings] Getting storage config for tableType: "${tableType}"`);
    storageConfig = controller.getStorageConfig(tableType);
    isGlobal = controller.isGlobalSettings(tableType);
  } catch (err) {
    console.error(`[useTableSettings] Error getting storage config for tableType: "${tableType}"`, err);
    storageConfig = null;
    isGlobal = false;
  }

  return {
    settings,
    loading,
    error,
    storageConfig,
    isGlobal,
    
    // Actions
    saveSettings,
    updateColumns,
    updateFilters,
    updateSort,
    updatePageSize,
    updateColumnWidth,
    toggleColumnVisibility,
    reorderColumns,
    resetToDefaults,
    
    // Utility functions
    getVisibleColumns: () => settings?.columns.filter(col => col.visible).sort((a, b) => a.order - b.order) || [],
    getColumnByKey: (key: string) => settings?.columns.find(col => col.key === key),
    isColumnVisible: (key: string) => settings?.columns.find(col => col.key === key)?.visible || false,
    getColumnWidth: (key: string) => settings?.columns.find(col => col.key === key)?.width,
  };
};

export default useTableSettings;
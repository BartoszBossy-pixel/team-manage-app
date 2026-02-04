// Interfejsy dla ustawień tabel

export interface ColumnSettings {
  key: string;
  width?: number;
  visible: boolean;
  order: number;
}

export interface FilterSettings {
  [key: string]: any;
  assignee?: string[];
  status?: string[];
  priority?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
}

export interface SortSettings {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TableSettings {
  id: string; // Unikalny identyfikator tabeli
  userId?: string; // ID użytkownika (dla localStorage)
  columns: ColumnSettings[];
  filters: FilterSettings;
  sort: SortSettings;
  pageSize: number;
  lastUpdated: number;
}

export interface TableSettingsData {
  settings: TableSettings[];
  lastSync: number;
}

// Typy tabel
export type TableType = 'in-progress' | 'awaiting-prod' | 'to-take' | 'more-info-request';

// Konfiguracja storage dla różnych tabel
export interface TableStorageConfig {
  tableType: TableType;
  storageType: 'dynamodb' | 'localStorage';
  isGlobal: boolean; // true = globalne ustawienia, false = per user
}

export const TABLE_STORAGE_CONFIG: Record<TableType, TableStorageConfig> = {
  'in-progress': {
    tableType: 'in-progress',
    storageType: 'dynamodb',
    isGlobal: true
  },
  'awaiting-prod': {
    tableType: 'awaiting-prod',
    storageType: 'localStorage',
    isGlobal: false
  },
  'to-take': {
    tableType: 'to-take',
    storageType: 'localStorage',
    isGlobal: false
  },
  'more-info-request': {
    tableType: 'more-info-request',
    storageType: 'localStorage',
    isGlobal: false
  }
};

// Domyślne ustawienia kolumn dla różnych tabel
export const DEFAULT_COLUMN_SETTINGS: Record<TableType, ColumnSettings[]> = {
  'in-progress': [
    { key: 'key', width: 120, visible: true, order: 0 },
    { key: 'summary', width: 300, visible: true, order: 1 },
    { key: 'assignee', width: 150, visible: true, order: 2 },
    { key: 'status', width: 120, visible: true, order: 3 },
    { key: 'priority', width: 100, visible: true, order: 4 },
    { key: 'created', width: 120, visible: true, order: 5 },
    { key: 'updated', width: 120, visible: true, order: 6 }
  ],
  'awaiting-prod': [
    { key: 'key', width: 120, visible: true, order: 0 },
    { key: 'summary', width: 350, visible: true, order: 1 },
    { key: 'assignee', width: 150, visible: true, order: 2 },
    { key: 'resolved', width: 120, visible: true, order: 3 },
    { key: 'priority', width: 100, visible: true, order: 4 }
  ],
  'to-take': [
    { key: 'key', width: 120, visible: true, order: 0 },
    { key: 'summary', width: 400, visible: true, order: 1 },
    { key: 'priority', width: 100, visible: true, order: 2 },
    { key: 'created', width: 120, visible: true, order: 3 },
    { key: 'labels', width: 200, visible: true, order: 4 }
  ],
  'more-info-request': [
    { key: 'number', width: 60, visible: true, order: 0 },
    { key: 'key', width: 120, visible: true, order: 1 },
    { key: 'summary', width: 350, visible: true, order: 2 },
    { key: 'status', width: 140, visible: true, order: 3 },
    { key: 'type', width: 100, visible: true, order: 4 },
    { key: 'priority', width: 80, visible: true, order: 5 },
    { key: 'assignee', width: 100, visible: true, order: 6 },
    { key: 'created', width: 140, visible: true, order: 7 }
  ]
};

// Domyślne ustawienia tabel
export const DEFAULT_TABLE_SETTINGS: Record<TableType, Omit<TableSettings, 'id' | 'userId' | 'lastUpdated'>> = {
  'in-progress': {
    columns: DEFAULT_COLUMN_SETTINGS['in-progress'],
    filters: {},
    sort: { column: 'updated', direction: 'desc' },
    pageSize: 50
  },
  'awaiting-prod': {
    columns: DEFAULT_COLUMN_SETTINGS['awaiting-prod'],
    filters: {},
    sort: { column: 'resolved', direction: 'desc' },
    pageSize: 25
  },
  'to-take': {
    columns: DEFAULT_COLUMN_SETTINGS['to-take'],
    filters: {},
    sort: { column: 'created', direction: 'desc' },
    pageSize: 30
  },
  'more-info-request': {
    columns: DEFAULT_COLUMN_SETTINGS['more-info-request'],
    filters: {},
    sort: { column: 'created', direction: 'desc' },
    pageSize: 25
  }
};
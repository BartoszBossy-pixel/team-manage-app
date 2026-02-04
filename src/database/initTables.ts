import { CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLE_NAMES } from './dynamoClient';

// Definicje tabel
const USERS_TABLE_DEFINITION = {
  TableName: TABLE_NAMES.USERS,
  KeySchema: [
    {
      AttributeName: 'id',
      KeyType: 'HASH' // Partition key
    }
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'id',
      AttributeType: 'S'
    }
  ],
  BillingMode: 'PAY_PER_REQUEST' // On-demand pricing
};

const USER_SETTINGS_TABLE_DEFINITION = {
  TableName: TABLE_NAMES.USER_SETTINGS,
  KeySchema: [
    {
      AttributeName: 'userId',
      KeyType: 'HASH' // Partition key
    },
    {
      AttributeName: 'settingKey',
      KeyType: 'RANGE' // Sort key
    }
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'userId',
      AttributeType: 'S'
    },
    {
      AttributeName: 'settingKey',
      AttributeType: 'S'
    }
  ],
  BillingMode: 'PAY_PER_REQUEST' // On-demand pricing
};

// Sprawdź czy tabela istnieje
const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const command = new DescribeTableCommand({ TableName: tableName });
    await dynamoClient.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
};

// Utwórz tabelę jeśli nie istnieje
const createTableIfNotExists = async (tableDefinition: any): Promise<void> => {
  const tableName = tableDefinition.TableName;
  
  if (await tableExists(tableName)) {
    console.log(`[DynamoDB] Table ${tableName} already exists`);
    return;
  }

  try {
    console.log(`[DynamoDB] Creating table ${tableName}...`);
    const command = new CreateTableCommand(tableDefinition);
    await dynamoClient.send(command);
    console.log(`[DynamoDB] Table ${tableName} created successfully`);
  } catch (error) {
    console.error(`[DynamoDB] Error creating table ${tableName}:`, error);
    throw error;
  }
};

// Inicjalizuj wszystkie tabele
export const initializeTables = async (): Promise<void> => {
  try {
    console.log('[DynamoDB] Initializing tables...');
    
    await createTableIfNotExists(USERS_TABLE_DEFINITION);
    await createTableIfNotExists(USER_SETTINGS_TABLE_DEFINITION);
    
    console.log('[DynamoDB] All tables initialized successfully');
  } catch (error) {
    console.error('[DynamoDB] Error initializing tables:', error);
    throw error;
  }
};

// Sprawdź status wszystkich tabel
export const checkTablesStatus = async (): Promise<{
  usersTable: boolean;
  userSettingsTable: boolean;
}> => {
  try {
    const usersTable = await tableExists(TABLE_NAMES.USERS);
    const userSettingsTable = await tableExists(TABLE_NAMES.USER_SETTINGS);
    
    console.log('[DynamoDB] Tables status:', {
      usersTable,
      userSettingsTable
    });
    
    return {
      usersTable,
      userSettingsTable
    };
  } catch (error) {
    console.error('[DynamoDB] Error checking tables status:', error);
    return {
      usersTable: false,
      userSettingsTable: false
    };
  }
};

// Funkcja pomocnicza do uruchomienia inicjalizacji z poziomu konsoli
if (typeof window !== 'undefined') {
  (window as any).initDynamoTables = initializeTables;
  (window as any).checkDynamoTablesStatus = checkTablesStatus;
}
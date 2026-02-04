import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Konfiguracja klienta DynamoDB
const createDynamoClient = () => {
  const config: any = {
    region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  };

  // Dla lokalnego developmentu - DynamoDB Local
  if (import.meta.env.VITE_DYNAMODB_ENDPOINT) {
    config.endpoint = import.meta.env.VITE_DYNAMODB_ENDPOINT;
    config.credentials = {
      accessKeyId: 'local',
      secretAccessKey: 'local'
    };
  } else {
    // Dla produkcji - użyj zmiennych środowiskowych AWS
    if (import.meta.env.VITE_AWS_ACCESS_KEY_ID && import.meta.env.VITE_AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
      };
    }
  }

  const client = new DynamoDBClient(config);
  return DynamoDBDocumentClient.from(client);
};

export const dynamoClient = createDynamoClient();

// Nazwy tabel
export const TABLE_NAMES = {
  USERS: import.meta.env.VITE_DYNAMODB_USERS_TABLE || 'kpi-dashboard-users',
  USER_SETTINGS: import.meta.env.VITE_DYNAMODB_USER_SETTINGS_TABLE || 'kpi-dashboard-user-settings'
};

// Sprawdź czy DynamoDB jest dostępne
export const isDynamoDBAvailable = async (): Promise<boolean> => {
  try {
    // Spróbuj wykonać prostą operację
    await dynamoClient.send({
      TableName: TABLE_NAMES.USERS,
      Key: { id: 'health-check' }
    } as any);
    return true;
  } catch (error) {
    console.warn('[DynamoDB] Not available, falling back to localStorage:', error);
    return false;
  }
};
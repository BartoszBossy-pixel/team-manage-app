// Script to initialize DynamoDB Local tables
import AWS from 'aws-sdk';

// Configure AWS for local DynamoDB
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy',
  endpoint: 'http://localhost:8000'
});

const dynamodb = new AWS.DynamoDB();

const createUsersTable = async () => {
  const params = {
    TableName: 'Users',
    KeySchema: [
      {
        AttributeName: 'id',
        KeyType: 'HASH'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'id',
        AttributeType: 'S'
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  };

  try {
    await dynamodb.createTable(params).promise();
    console.log('✅ Users table created successfully');
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log('ℹ️  Users table already exists');
    } else {
      console.error('❌ Error creating Users table:', error);
    }
  }
};

const createTableSettingsTable = async () => {
  const params = {
    TableName: 'TableSettings',
    KeySchema: [
      {
        AttributeName: 'id',
        KeyType: 'HASH'
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'id',
        AttributeType: 'S'
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  };

  try {
    await dynamodb.createTable(params).promise();
    console.log('✅ TableSettings table created successfully');
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log('ℹ️  TableSettings table already exists');
    } else {
      console.error('❌ Error creating TableSettings table:', error);
    }
  }
};

const initializeTables = async () => {
  console.log('🚀 Initializing DynamoDB Local tables...');
  
  try {
    await createUsersTable();
    await createTableSettingsTable();
    console.log('🎉 All tables initialized successfully!');
  } catch (error) {
    console.error('💥 Failed to initialize tables:', error);
    process.exit(1);
  }
};

// Run initialization
initializeTables();
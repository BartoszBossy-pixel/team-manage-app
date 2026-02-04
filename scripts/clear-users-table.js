// Script to clear Users table in DynamoDB
import AWS from 'aws-sdk';

// Configure AWS for local DynamoDB
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy',
  endpoint: 'http://localhost:8000'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

const clearUsersTable = async () => {
  console.log('🧹 Clearing Users table...');
  
  try {
    // First, scan all items to get their keys
    const scanParams = {
      TableName: 'Users'
    };
    
    const scanResult = await dynamodb.scan(scanParams).promise();
    const items = scanResult.Items || [];
    
    console.log(`📊 Found ${items.length} users to delete`);
    
    // Delete each item
    for (const item of items) {
      const deleteParams = {
        TableName: 'Users',
        Key: {
          id: item.id
        }
      };
      
      await dynamodb.delete(deleteParams).promise();
      console.log(`🗑️  Deleted user: ${item.displayName} (${item.id})`);
    }
    
    console.log('✅ Users table cleared successfully!');
    console.log(`📊 Total users deleted: ${items.length}`);
    
  } catch (error) {
    console.error('💥 Failed to clear users table:', error);
    process.exit(1);
  }
};

// Run clearing
clearUsersTable();
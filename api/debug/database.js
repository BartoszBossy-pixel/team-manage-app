import AWS from 'aws-sdk';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[DEBUG] Fetching all database contents...');
    
    // Configure AWS for DynamoDB
    const config = {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
    };

    // Add endpoint for local DynamoDB if specified
    if (process.env.AWS_ENDPOINT_URL) {
      config.endpoint = process.env.AWS_ENDPOINT_URL;
    }

    AWS.config.update(config);
    const dynamodb = new AWS.DynamoDB.DocumentClient(config);
    const results = {};
    
    // List of tables to check
    const tables = ['Users', 'TableSettings'];
    
    for (const tableName of tables) {
      try {
        console.log(`[DEBUG] Scanning table: ${tableName}`);
        
        const params = {
          TableName: tableName
        };
        
        const result = await dynamodb.scan(params).promise();
        results[tableName] = {
          count: result.Count,
          items: result.Items
        };
        
        console.log(`[DEBUG] Found ${result.Count} items in ${tableName}`);
      } catch (tableError) {
        console.error(`[DEBUG] Error scanning table ${tableName}:`, tableError);
        results[tableName] = {
          error: tableError.message,
          count: 0,
          items: []
        };
      }
    }
    
    // Also check localStorage simulation (if any data exists in memory)
    results.localStorage = {
      note: "localStorage data is stored in browser, not accessible from server",
      count: 0,
      items: []
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: results
    });
    
  } catch (error) {
    console.error('[DEBUG] Error fetching database contents:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
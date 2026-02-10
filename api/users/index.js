import AWS from 'aws-sdk';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Configure AWS for DynamoDB
    const config = {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
    };

    if (process.env.AWS_ENDPOINT_URL) {
      config.endpoint = process.env.AWS_ENDPOINT_URL;
    }

    AWS.config.update(config);
    const dynamodb = new AWS.DynamoDB.DocumentClient(config);

    if (req.method === 'GET') {
      console.log('[API] Getting all users from DynamoDB');
      
      const params = {
        TableName: 'Users'
      };

      const result = await dynamodb.scan(params).promise();
      const users = result.Items || [];
      
      console.log(`[API] Retrieved ${users.length} users from DynamoDB`);
      res.json({ success: true, users });

    } else if (req.method === 'POST') {
      const users = req.body.users || [req.body];
      console.log(`[API] Saving ${users.length} users to DynamoDB`);
      
      // Save each user individually
      const promises = users.map(user => {
        const params = {
          TableName: 'Users',
          Item: {
            ...user,
            lastUpdated: Date.now()
          }
        };
        return dynamodb.put(params).promise();
      });

      await Promise.all(promises);
      console.log(`[API] Successfully saved ${users.length} users to DynamoDB`);
      res.json({ success: true, message: `Saved ${users.length} users to DynamoDB` });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('[API] Error with users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
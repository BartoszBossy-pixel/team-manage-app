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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tableType } = req.query;
    const { userId } = req.query;
    
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
    
    const params = {
      TableName: 'TableSettings',
      Key: {
        id: userId ? `${tableType}-${userId}` : tableType
      }
    };

    const result = await dynamodb.get(params).promise();
    
    if (result.Item) {
      const { id, ...settings } = result.Item;
      res.json({ success: true, settings });
    } else {
      res.json({ success: true, settings: null });
    }
    
  } catch (error) {
    console.error('Error getting table settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
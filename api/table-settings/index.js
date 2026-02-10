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

    if (req.method === 'POST') {
      const settings = req.body;
      
      const params = {
        TableName: 'TableSettings',
        Item: {
          id: settings.userId ? `${settings.id}-${settings.userId}` : settings.id,
          ...settings,
          lastUpdated: Date.now()
        }
      };

      await dynamodb.put(params).promise();
      console.log(`[API] Saved table settings for ${settings.id} to DynamoDB`);
      res.json({ success: true, message: 'Settings saved to DynamoDB' });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Error with table settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
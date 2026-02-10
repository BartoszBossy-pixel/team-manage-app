import AWS from 'aws-sdk';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
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

    if (req.method === 'GET') {
      console.log(`[API] Getting user ${userId} from DynamoDB`);
      
      const params = {
        TableName: 'Users',
        Key: { id: userId }
      };

      const result = await dynamodb.get(params).promise();
      
      if (result.Item) {
        console.log(`[API] Found user: ${result.Item.displayName}`);
        res.json({ success: true, user: result.Item });
      } else {
        console.log(`[API] User ${userId} not found`);
        res.status(404).json({ success: false, error: 'User not found' });
      }

    } else if (req.method === 'PUT') {
      const userData = req.body;
      console.log(`[API] Updating user ${userId} in DynamoDB`);
      
      const updatedUser = {
        ...userData,
        id: userId,
        lastUpdated: Date.now()
      };
      
      const params = {
        TableName: 'Users',
        Item: updatedUser
      };

      await dynamodb.put(params).promise();
      console.log(`[API] Successfully updated user: ${updatedUser.displayName || userId}`);
      res.json({ success: true, user: updatedUser });

    } else if (req.method === 'DELETE') {
      console.log(`[API] Deleting user ${userId} from DynamoDB`);
      
      const params = {
        TableName: 'Users',
        Key: { id: userId }
      };

      await dynamodb.delete(params).promise();
      console.log(`[API] Successfully deleted user ${userId}`);
      res.json({ success: true, message: 'User deleted successfully' });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('[API] Error with user operation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
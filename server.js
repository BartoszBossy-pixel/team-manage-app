import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import AWS from 'aws-sdk';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Jira Proxy Server is running' });
});

// Jira search endpoint
app.get('/api/jira-search', async (req, res) => {
  try {
    const { jql, maxResults = 100, domain, auth } = req.query;

    if (!jql || !domain || !auth) {
      return res.status(400).json({ 
        error: 'Missing required parameters: jql, domain, and auth are required' 
      });
    }

    console.log(`Fetching Jira issues with JQL: ${jql}`);
    console.log(`Domain: ${domain}`);

    const response = await axios.get(`https://${domain}/rest/api/3/search/jql`, {
      params: {
        jql,
        maxResults,
        fields: 'key,issuetype,created,status,summary,priority,assignee,customfield_13587,customfield_13568,customfield_14219,customfield_13188',
        expand: '' // Don't expand any additional data
      },
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 15000 // Reduced timeout from 30s to 15s
    });

    console.log(`Successfully fetched ${response.data.issues.length} issues`);
    res.json(response.data);

  } catch (error) {
    console.error('Error fetching data from Jira:', error.message);
    
    if (error.response) {
      // Jira API returned an error
      const status = error.response.status;
      const message = error.response.data?.errorMessages?.[0] || error.response.statusText;
      
      if (status === 401) {
        return res.status(401).json({ 
          error: 'Authentication failed. Please check your email and API token.' 
        });
      } else if (status === 403) {
        return res.status(403).json({ 
          error: 'Access denied. Please check your permissions for this project.' 
        });
      } else if (status === 404) {
        return res.status(404).json({ 
          error: 'Project not found. Please check your domain and project key.' 
        });
      } else {
        return res.status(status).json({ 
          error: `Jira API error: ${message}` 
        });
      }
    } else if (error.code === 'ENOTFOUND') {
      return res.status(400).json({ 
        error: 'Invalid Jira domain. Please check your domain configuration.' 
      });
    } else if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ 
        error: 'Request timeout. Jira API is taking too long to respond.' 
      });
    } else {
      return res.status(500).json({ 
        error: 'Internal server error while connecting to Jira' 
      });
    }
  }
});

// Get project information
app.get('/api/jira-project/:projectKey', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const { domain, auth } = req.query;

    if (!domain || !auth) {
      return res.status(400).json({ 
        error: 'Missing required parameters: domain and auth are required' 
      });
    }

    const response = await axios.get(`https://${domain}/rest/api/3/project/${projectKey}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    res.json(response.data);

  } catch (error) {
    console.error('Error fetching project info:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: `Project '${req.params.projectKey}' not found` 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch project information' 
    });
  }
});

// Get issue types for the project
app.get('/api/jira-issue-types', async (req, res) => {
  try {
    const { domain, auth } = req.query;

    if (!domain || !auth) {
      return res.status(400).json({ 
        error: 'Missing required parameters: domain and auth are required' 
      });
    }

    const response = await axios.get(`https://${domain}/rest/api/3/issuetype`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    res.json(response.data);

  } catch (error) {
    console.error('Error fetching issue types:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch issue types' 
    });
  }
});

// Get all team issues (all statuses)
app.get('/api/jira-in-progress', async (req, res) => {
  try {
    const { domain, auth, projectKey, team } = req.query;

    if (!domain || !auth || !projectKey) {
      return res.status(400).json({
        error: 'Missing required parameters: domain, auth, and projectKey are required'
      });
    }

    console.log(`Fetching all team issues for project: ${projectKey}, team: ${team || 'all'}`);
    
    // JQL to get all team issues with assignees, filtered by team if specified
    let jql = `project = ${projectKey} AND assignee is not EMPTY`;
    
    // Add team filter if specified
    if (team && team.toLowerCase() !== 'all') {
      // Filter by team field - try multiple possible field names where team might be stored
      jql += ` AND (Team = "${team}" OR "Team (GOLD)" = "${team}" OR component = "${team}" OR "Development Team" = "${team}" OR labels = "${team}")`;
    }

    const response = await axios.get(`https://${domain}/rest/api/3/search/jql`, {
      params: {
        jql,
        maxResults: 50,
        fields: 'key,issuetype,created,status,summary,priority,assignee,customfield_13587,customfield_13568,customfield_14219,customfield_13188',
        expand: '' // Don't expand any additional data
      },
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 15000 // Reduced timeout from 30s to 15s
    });

    console.log(`Successfully fetched ${response.data.issues.length} team issues`);
    res.json(response.data);

  } catch (error) {
    console.error('Error fetching in progress issues:', error.message);
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.errorMessages?.[0] || error.response.statusText;
      
      return res.status(status).json({
        error: `Jira API error: ${message}`
      });
    } else {
      return res.status(500).json({
        error: 'Failed to fetch team issues'
      });
    }
  }
});

// Get project roles
app.get('/api/jira-project-roles', async (req, res) => {
  try {
    const { projectKey, domain, auth } = req.query;

    if (!projectKey || !domain || !auth) {
      return res.status(400).json({
        error: 'Missing required parameters: projectKey, domain and auth are required'
      });
    }

    console.log(`Fetching project roles for project: ${projectKey}`);

    const response = await axios.get(`https://${domain}/rest/api/3/project/${projectKey}/role`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    console.log(`Successfully fetched ${Object.keys(response.data).length} project roles`);
    res.json(response.data);

  } catch (error) {
    console.error('Error fetching project roles:', error.message);
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.errorMessages?.[0] || error.response.statusText;
      
      if (status === 404) {
        return res.status(404).json({
          error: `Project '${req.query.projectKey}' not found or no roles available`
        });
      } else {
        return res.status(status).json({
          error: `Jira API error: ${message}`
        });
      }
    } else {
      return res.status(500).json({
        error: 'Failed to fetch project roles'
      });
    }
  }
});

// Get specific project role details
app.get('/api/jira-project-role', async (req, res) => {
  try {
    const { projectKey, roleId, domain, auth } = req.query;

    if (!projectKey || !roleId || !domain || !auth) {
      return res.status(400).json({
        error: 'Missing required parameters: projectKey, roleId, domain and auth are required'
      });
    }

    console.log(`Fetching project role ${roleId} details for project: ${projectKey}`);

    const response = await axios.get(`https://${domain}/rest/api/3/project/${projectKey}/role/${roleId}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    console.log(`Successfully fetched role '${response.data.name}' with ${response.data.actors.length} actors`);
    res.json(response.data);

  } catch (error) {
    console.error(`Error fetching project role ${req.query.roleId}:`, error.message);
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.errorMessages?.[0] || error.response.statusText;
      
      if (status === 404) {
        return res.status(404).json({
          error: `Role '${req.query.roleId}' not found in project '${req.query.projectKey}'`
        });
      } else {
        return res.status(status).json({
          error: `Jira API error: ${message}`
        });
      }
    } else {
      return res.status(500).json({
        error: `Failed to fetch project role ${req.query.roleId}`
      });
    }
  }
});

// Table Settings endpoints
app.get('/api/table-settings/:tableType', async (req, res) => {
  try {
    const { tableType } = req.params;
    const { userId } = req.query;
    
    // Configure AWS for DynamoDB Local
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
});

app.post('/api/table-settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Configure AWS for DynamoDB Local
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
      Item: {
        id: settings.userId ? `${settings.id}-${settings.userId}` : settings.id,
        ...settings,
        lastUpdated: Date.now()
      }
    };

    await dynamodb.put(params).promise();
    console.log(`[API] Saved table settings for ${settings.id} to DynamoDB`);
    res.json({ success: true, message: 'Settings saved to DynamoDB' });
    
  } catch (error) {
    console.error('Error saving table settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// User Management endpoints
app.get('/api/users', async (req, res) => {
  try {
    console.log('[API] Getting all users from DynamoDB');
    
    // Configure AWS for DynamoDB Local
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
      TableName: 'Users'
    };

    const result = await dynamodb.scan(params).promise();
    const users = result.Items || [];
    
    console.log(`[API] Retrieved ${users.length} users from DynamoDB`);
    res.json({ success: true, users });
    
  } catch (error) {
    console.error('[API] Error getting users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`[API] Getting user ${userId} from DynamoDB`);
    
    // Configure AWS for DynamoDB Local
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
    
  } catch (error) {
    console.error('[API] Error getting user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const users = req.body.users || [req.body];
    console.log(`[API] Saving ${users.length} users to DynamoDB`);
    
    // Configure AWS for DynamoDB Local
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
    
  } catch (error) {
    console.error('[API] Error saving users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.body;
    console.log(`[API] Updating user ${userId} in DynamoDB`);
    
    // Configure AWS for DynamoDB Local
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
    
  } catch (error) {
    console.error('[API] Error updating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`[API] Deleting user ${userId} from DynamoDB`);
    
    // Configure AWS for DynamoDB Local
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
      TableName: 'Users',
      Key: { id: userId }
    };

    await dynamodb.delete(params).promise();
    console.log(`[API] Successfully deleted user ${userId}`);
    res.json({ success: true, message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('[API] Error deleting user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to view database contents
app.get('/api/debug/database', async (req, res) => {
  try {
    console.log('[DEBUG] Fetching all database contents...');
    
    // Configure AWS for DynamoDB Local
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
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Jira Proxy Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard will be available at http://localhost:3000`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log(`   GET /api/jira-search - Search for Jira issues`);
  console.log(`   GET /api/jira-project/:projectKey - Get project info`);
  console.log(`   GET /api/jira-issue-types - Get available issue types`);
  console.log(`   GET /api/jira-in-progress - Get in progress issues for team`);
  console.log(`   GET /api/jira-project-roles - Get project roles`);
  console.log(`   GET /api/jira-project-role - Get specific project role details`);
  console.log(`   GET /api/table-settings/:tableType - Get table settings`);
  console.log(`   POST /api/table-settings - Save table settings`);
  console.log(`   GET /api/users - Get all users`);
  console.log(`   GET /api/users/:userId - Get specific user`);
  console.log(`   POST /api/users - Save users`);
  console.log(`   PUT /api/users/:userId - Update user`);
  console.log(`   DELETE /api/users/:userId - Delete user`);
  console.log(`   GET /api/debug/database - View database contents (debug)`);
  console.log('');
  console.log('⚠️  Make sure to:');
  console.log('   1. Copy .env.example to .env and fill in your Jira credentials');
  console.log('   2. Install dependencies: npm install');
  console.log('   3. Start the React app: npm run dev');
});
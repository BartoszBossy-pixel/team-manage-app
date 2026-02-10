import axios from 'axios';

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
        expand: ''
      },
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log(`Successfully fetched ${response.data.issues.length} issues`);
    res.json(response.data);

  } catch (error) {
    console.error('Error fetching data from Jira:', error.message);
    
    if (error.response) {
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
}
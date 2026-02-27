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
        expand: ''
      },
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 15000
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
}
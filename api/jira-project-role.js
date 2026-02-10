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
}
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
}
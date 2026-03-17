import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { groupname } = req.query;
    const domain = process.env.JIRA_DOMAIN;
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

    if (!groupname) {
      return res.status(400).json({
        error: 'Missing required parameter: groupname is required'
      });
    }

    console.log(`Fetching members of Jira group: ${groupname}`);

    const response = await axios.get(`https://${domain}/rest/api/3/group/member`, {
      params: { groupname, includeInactiveUsers: false, maxResults: 100 },
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
      timeout: 15000
    });

    const members = (response.data.values || []).map(u => ({
      accountId: u.accountId,
      displayName: u.displayName,
      emailAddress: u.emailAddress,
      active: u.active,
    }));

    console.log(`Found ${members.length} members in group '${groupname}'`);
    res.json({ members });

  } catch (error) {
    console.error('Error fetching Jira group members:', error.message);
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.errorMessages?.[0] || error.response.statusText;
      return res.status(status).json({ error: `Jira API error: ${message}` });
    }
    return res.status(500).json({ error: 'Failed to fetch group members' });
  }
}

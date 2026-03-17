export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const token = process.env.JIRA_API_TOKEN || '';
  const email = process.env.JIRA_EMAIL || '';
  const domain = process.env.JIRA_DOMAIN || '';

  res.json({
    JIRA_DOMAIN: domain || '(not set)',
    JIRA_EMAIL: email || '(not set)',
    JIRA_API_TOKEN_LENGTH: token.length,
    JIRA_API_TOKEN_PREVIEW: token ? `${token.slice(0, 8)}...${token.slice(-6)}` : '(not set)',
  });
}

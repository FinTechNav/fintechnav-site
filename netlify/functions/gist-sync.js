// Free Cross-Device State Sync via Private GitHub Gist (0 database cost on Netlify Free Tier!)

exports.handler = async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Passcode'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const gistToken = process.env.GITHUB_GIST_TOKEN || '';
  const gistId = process.env.GITHUB_GIST_ID || '';

  if (!gistToken || !gistId) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: false,
        configured: false,
        message: 'Using local browser storage (set GITHUB_GIST_TOKEN and GITHUB_GIST_ID in Netlify Env Vars for automatic cloud sync across devices).'
      })
    };
  }

  const gistUrl = `https://api.github.com/gists/${encodeURIComponent(gistId)}`;
  const ghHeaders = {
    'Authorization': `Bearer ${gistToken}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'RedDay-AI-PWA'
  };

  try {
    if (event.httpMethod === 'GET') {
      const res = await fetch(gistUrl, { headers: ghHeaders });
      if (!res.ok) throw new Error(`GitHub Gist HTTP ${res.status}`);
      const data = await res.json();
      const fileContent = data.files?.['redday_ai_state.json']?.content;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          configured: true,
          state: fileContent ? JSON.parse(fileContent) : null
        })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const res = await fetch(gistUrl, {
        method: 'PATCH',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `RedDay AI Schwab Portfolio State (Updated ${new Date().toISOString()})`,
          files: {
            'redday_ai_state.json': {
              content: JSON.stringify(body.state || {}, null, 2)
            }
          }
        })
      });
      if (!res.ok) throw new Error(`GitHub Gist PATCH HTTP ${res.status}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, configured: true, syncedAt: new Date().toISOString() })
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, configured: true, error: err.message })
    };
  }
};

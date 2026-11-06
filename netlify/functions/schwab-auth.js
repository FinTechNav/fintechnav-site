// Charles Schwab OAuth 2.0 Token Manager (7-Day Refresh Token + 30-Min Access Token)
// Includes full server-side diagnostic logging and safe non-JSON response handling.

const SCHWAB_AUTH_URL = 'https://api.schwabapi.com/v1/oauth/authorize';
const SCHWAB_TOKEN_URL = 'https://api.schwabapi.com/v1/oauth/token';

function extractAuthCode(input) {
  if (!input) return '';
  const trimmed = String(input).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const codeParam = url.searchParams.get('code');
      if (codeParam) return decodeURIComponent(codeParam);
    } catch {
      // Fallback regex if URL parsing fails
    }
  }
  const match = trimmed.match(/[?&]code=([^&#]+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return decodeURIComponent(trimmed);
}

exports.handler = async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Passcode'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const clientId = (process.env.SCHWAB_CLIENT_ID || 'dDGOfkYTf73UDWetFsYXgAZ70jGkO9dYNCryLW0AtFSG8vVY').trim();
  const clientSecret = (process.env.SCHWAB_CLIENT_SECRET || '').trim();
  const callbackUrl = (process.env.SCHWAB_CALLBACK_URL || 'https://redday-ai-schwab.netlify.app').trim();

  if (event.httpMethod === 'GET') {
    const reqCallback = (event.queryStringParameters?.redirect_uri || callbackUrl).trim().replace(/\/+$/, '');
    const authUrl = `${SCHWAB_AUTH_URL}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(reqCallback)}`;

    console.log(`[schwab-auth][GET] Prepared OAuth URL for redirect_uri=${reqCallback}, credentialsConfigured=${Boolean(clientId && clientSecret)}`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        credentialsConfigured: Boolean(clientId && clientSecret),
        callbackUrl: reqCallback,
        authUrl
      })
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const finalClientId = (body.clientId || clientId).trim();
      const finalClientSecret = (body.clientSecret || clientSecret).trim();
      const finalCallback = (body.callbackUrl || callbackUrl).trim().replace(/\/+$/, '');

      console.log(`[schwab-auth][POST] action=${body.action} callbackUrl=${finalCallback} hasClientSecret=${Boolean(finalClientSecret)}`);

      if (!finalClientId || !finalClientSecret) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'Missing SCHWAB_CLIENT_ID or SCHWAB_CLIENT_SECRET in Netlify Environment Variables.'
          })
        };
      }

      const basicAuth = Buffer.from(`${finalClientId}:${finalClientSecret}`).toString('base64');
      const params = new URLSearchParams();

      if (body.action === 'exchange') {
        const code = extractAuthCode(body.redirectUrlOrCode);
        if (!code) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ ok: false, error: 'Could not extract authorization code (?code=...) from the redirect URL.' })
          };
        }
        params.set('grant_type', 'authorization_code');
        params.set('code', code);
        params.set('redirect_uri', finalCallback);
      } else if (body.action === 'refresh') {
        if (!body.refreshToken) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ ok: false, error: 'Missing refresh_token for token refresh.' })
          };
        }
        params.set('grant_type', 'refresh_token');
        params.set('refresh_token', body.refreshToken);
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Invalid action. Use "exchange" or "refresh".' })
        };
      }

      const resp = await fetch(SCHWAB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      const rawText = await resp.text();
      let tokenData = {};
      try {
        tokenData = JSON.parse(rawText);
      } catch {
        tokenData = { rawResponse: rawText.slice(0, 300) };
      }

      if (!resp.ok) {
        console.error(`[schwab-auth][ERROR] HTTP ${resp.status}:`, tokenData);
        return {
          statusCode: resp.status,
          headers,
          body: JSON.stringify({
            ok: false,
            httpStatus: resp.status,
            error: tokenData.error_description || tokenData.error || `Schwab token endpoint returned HTTP ${resp.status}`,
            details: tokenData
          })
        };
      }

      const now = Date.now();
      console.log(`[schwab-auth][SUCCESS] Token issued (expires_in=${tokenData.expires_in}s)`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || body.refreshToken,
          accessTokenExpiresAt: now + (tokenData.expires_in || 1800) * 1000,
          refreshTokenExpiresAt: body.action === 'exchange'
            ? now + 7 * 24 * 60 * 60 * 1000
            : (body.refreshTokenExpiresAt || now + 7 * 24 * 60 * 60 * 1000)
        })
      };
    } catch (err) {
      console.error(`[schwab-auth][EXCEPTION]`, err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: err.message })
      };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

import { protect, json, env, readBody, cleanState, HttpError } from './security.mjs';

export const createHandler = (dependencies = {}) =>
  protect(async (request) => {
    if (!['GET', 'POST'].includes(request.method)) throw new HttpError(405, 'Method not allowed.');
    const token = env('GITHUB_GIST_TOKEN');
    const id = env('GITHUB_GIST_ID');
    if (!token || !id) return json({ ok: true, configured: false });
    const fetcher = dependencies.fetcher || fetch;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'FinTechNav-Stock',
    };
    const options = { headers, signal: AbortSignal.timeout(15000) };
    if (request.method === 'POST') {
      const body = await readBody(request);
      options.method = 'PATCH';
      options.body = JSON.stringify({
        files: { 'redday_ai_state.json': { content: JSON.stringify(cleanState(body.state)) } },
      });
    }
    const response = await fetcher(
      `https://api.github.com/gists/${encodeURIComponent(id)}`,
      options
    );
    if (!response.ok) throw new HttpError(502, 'Preference sync is temporarily unavailable.');
    if (request.method === 'POST') return json({ ok: true, configured: true });
    const data = await response.json();
    const content = data.files?.['redday_ai_state.json']?.content;
    return json({
      ok: true,
      configured: true,
      state: cleanState(content ? JSON.parse(content) : {}),
    });
  }, dependencies);
export default createHandler();

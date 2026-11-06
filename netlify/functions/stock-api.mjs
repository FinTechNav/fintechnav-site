import auth from '../../server/stock/schwab-auth.mjs';
import trade from '../../server/stock/schwab-trade.mjs';
import sync from '../../server/stock/gist-sync.mjs';
import views from '../../server/stock/portfolio-views.mjs';
import scan from '../../server/stock/market-scan.mjs';
import { json } from '../../server/stock/security.mjs';

const routes = {
  '/api/schwab-auth': auth,
  '/api/portfolio-views': views,
  '/api/schwab-trade': trade,
  '/api/gist-sync': sync,
  '/api/market-scan': scan,
};
export default (request, context) =>
  routes[new URL(request.url).pathname]?.(request, context) ??
  json({ ok: false, error: 'Not found.' }, 404);
// Free plans allow two code-based rules. One protects all stock API routes;
// the other is on stock-session. Custom paths replace the default function URL.
export const config = {
  path: [
    '/api/portfolio-views',
    '/api/schwab-auth',
    '/api/schwab-trade',
    '/api/gist-sync',
    '/api/market-scan',
  ],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};

import scanner from './market-scan.cjs';
import { protect, json, HttpError } from './security.mjs';

export default protect(async (request) => {
  if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
  const parameters = Object.fromEntries(new URL(request.url).searchParams);
  if (parameters.symbols && !/^[A-Za-z0-9.,^=-]{1,250}$/.test(parameters.symbols))
    throw new HttpError(400, 'Invalid stock symbols.');
  const result = await scanner.handler({ queryStringParameters: parameters });
  return json(JSON.parse(result.body), result.statusCode);
});

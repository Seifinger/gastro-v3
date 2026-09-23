// Bearer-token gate for every writing dashboard route. The token is never
// echoed back in a response body, never logged, and compared in constant
// time so its value can't leak through a timing side channel.
import { timingSafeEqual } from 'node:crypto';

function tokenFromHeader(req) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/.exec(header);
  return match ? match[1] : null;
}

export function requireDashboardToken(req, res, next) {
  const expected = process.env.DASHBOARD_TOKEN;
  if (!expected) {
    return res.status(500).json({ error: 'DASHBOARD_TOKEN ist serverseitig nicht gesetzt.' });
  }
  const provided = tokenFromHeader(req);
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided ?? '');
  const ok = provided && expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);
  if (!ok) return res.status(401).json({ error: 'Ungültiges oder fehlendes Dashboard-Token.' });
  next();
}

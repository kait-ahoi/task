const net = require('net');

function parseAllowedCidrs() {
  const raw = process.env.ALLOWED_IPS || '';
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isInCidr(ip, cidr) {
  if (!cidr.includes('/')) return ip === cidr;
  const [base, bits] = cidr.split('/');
  const mask = bits === '32' ? 0xffffffff : (~0 << (32 - parseInt(bits, 10))) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(base) & mask);
}

function getClientIp(req) {
  return (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
}

function ipWhitelist(req, res, next) {
  const allowed = parseAllowedCidrs();
  if (allowed.length === 0) return next();

  const clientIp = getClientIp(req);

  if (allowed.some(cidr => isInCidr(clientIp, cidr))) return next();

  res.status(403).send(`<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Juurdepääs keelatud</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 48px 56px;
      text-align: center;
      max-width: 480px;
      width: 90%;
    }
    .icon { font-size: 48px; margin-bottom: 24px; }
    h1 { font-size: 22px; font-weight: 600; margin-bottom: 12px; color: #f1f5f9; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 8px; }
    .ip {
      display: inline-block;
      margin-top: 16px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 8px 16px;
      font-family: monospace;
      font-size: 14px;
      color: #f59e0b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#128274;</div>
    <h1>Juurdepääs keelatud</h1>
    <p>Sinu IP-aadress ei ole lubatud sellele lehele ligi pääseda.</p>
    <p>Võta ühendust administraatoriga.</p>
    <div class="ip">${clientIp}</div>
  </div>
</body>
</html>`);
}

module.exports = ipWhitelist;

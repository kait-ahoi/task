const pins = (process.env.ADMIN_PINS || process.env.ADMIN_PIN || '')
  .split(',').map(p => p.trim()).filter(Boolean);

module.exports = function requirePin(req, res, next) {
  if (pins.length && pins.includes(req.headers['x-admin-pin'])) return next();
  res.status(403).json({ error: 'Invalid admin PIN' });
};

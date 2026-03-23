module.exports = function requirePin(req, res, next) {
  const pin = req.headers['x-admin-pin'];
  if (!pin || pin !== process.env.ADMIN_PIN) {
    return res.status(403).json({ error: 'Invalid admin PIN' });
  }
  next();
};

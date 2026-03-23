require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/projects', require('./src/routes/projects'));
app.use('/api/stats', require('./src/routes/stats'));

// SPA fallback
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`AI Project Registry running on http://127.0.0.1:${PORT}`);
  console.log(`Admin PIN is set via ADMIN_PIN environment variable`);
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
  process.exit(1);
});

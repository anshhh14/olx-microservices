require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { init } = require('./db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'listing-service' }));

app.use('/api/listings', routes);

async function start() {
  try {
    await init();
    app.listen(PORT, () => console.log(`listing-service listening on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start listing-service:', err);
    process.exit(1);
  }
}

start();

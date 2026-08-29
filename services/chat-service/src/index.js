require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connect } = require('./db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'chat-service' }));

app.use('/api/chat', routes);

async function start() {
  try {
    await connect();
    app.listen(PORT, () => console.log(`chat-service listening on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start chat-service:', err);
    process.exit(1);
  }
}

start();

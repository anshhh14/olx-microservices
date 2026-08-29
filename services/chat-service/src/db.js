const mongoose = require('mongoose');

async function connect() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/chat_db';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

module.exports = { connect };

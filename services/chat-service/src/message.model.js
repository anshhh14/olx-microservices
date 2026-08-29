const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  listingId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  text: { type: String, required: true },
  // Regular chat messages are type "text". A buyer bargaining sends type
  // "offer" instead, carrying a proposed amount the seller can accept/reject.
  type: { type: String, enum: ['text', 'offer'], default: 'text' },
  amount: { type: Number },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'] },
  createdAt: { type: Date, default: Date.now },
});

// A conversation is uniquely identified by listing + the two participants
messageSchema.index({ listingId: 1, senderId: 1, receiverId: 1 });

module.exports = mongoose.model('Message', messageSchema);

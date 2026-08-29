const express = require('express');
const Message = require('./message.model');

const router = express.Router();

// Send a message (regular text, or a bargain offer)
router.post('/messages', async (req, res) => {
  try {
    const { listingId, senderId, receiverId, text, type, amount } = req.body;
    if (!listingId || !senderId || !receiverId || !text) {
      return res.status(400).json({ error: 'listingId, senderId, receiverId, and text are required' });
    }

    const payload = { listingId, senderId, receiverId, text };
    if (type === 'offer') {
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'a valid amount is required for an offer' });
      }
      payload.type = 'offer';
      payload.amount = Number(amount);
      payload.status = 'pending';
    }

    const message = await Message.create(payload);
    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Seller accepts or rejects a bargain offer message
router.patch('/messages/:messageId/respond', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "status must be 'accepted' or 'rejected'" });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'message not found' });
    if (message.type !== 'offer') return res.status(400).json({ error: 'this message is not an offer' });
    if (message.status !== 'pending') {
      return res.status(409).json({ error: `this offer was already ${message.status}` });
    }

    message.status = status;
    await message.save();
    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Get full conversation between two users about a listing
router.get('/messages/:listingId/:userA/:userB', async (req, res) => {
  try {
    const { listingId, userA, userB } = req.params;
    const messages = await Message.find({
      listingId,
      $or: [
        { senderId: userA, receiverId: userB },
        { senderId: userB, receiverId: userA },
      ],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Get a list of a user's conversations (most recent message per listing+partner)
router.get('/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    const seen = new Set();
    const conversations = [];
    for (const m of messages) {
      const partner = m.senderId === userId ? m.receiverId : m.senderId;
      const key = `${m.listingId}:${partner}`;
      if (!seen.has(key)) {
        seen.add(key);
        conversations.push({ listingId: m.listingId, partner, lastMessage: m.text, at: m.createdAt });
      }
    }
    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;

 
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');

// Send a message
router.post('/', auth, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const message = new Message({
      sender: req.user.id,
      receiver: receiverId,
      text,
    });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages between two users
router.get('/', auth, async (req, res) => {
  try {
    const { otherUserId } = req.query;
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user.id },
      ],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
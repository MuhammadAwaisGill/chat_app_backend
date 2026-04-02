const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Group = require('../models/Group');
const Message = require('../models/Message');

// Create a group
router.post('/', auth, async (req, res) => {
  try {
    const { name, members } = req.body;
    const group = new Group({
      name,
      members: [...members, req.user.id],
      admin: req.user.id,
    });
    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's groups
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id }).populate('members', '-password');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get group messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ group: req.params.id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 

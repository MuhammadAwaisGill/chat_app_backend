const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');

const userSocketMap = {};

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.query.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    userSocketMap[userId] = socket.id;

    await User.findByIdAndUpdate(userId, { status: 'online' });
    console.log('User connected:', userId);

    socket.join(userId);

    socket.on('send_message', async (data) => {
      const { receiverId, text, groupId } = data;
      const message = new Message({
        sender: userId,
        receiver: receiverId || null,
        group: groupId || null,
        text,
      });
      await message.save();

      if (groupId) {
        io.to(groupId).emit('receive_message', message);
      } else {
        io.to(receiverId).emit('receive_message', message);
        io.to(userId).emit('receive_message', message);
      }
    });

    socket.on('join_room', (groupId) => {
      socket.join(groupId);
    });

    socket.on('typing_start', (data) => {
      socket.to(data.receiverId).emit('typing_start', { senderId: userId });
    });

    socket.on('typing_stop', (data) => {
      socket.to(data.receiverId).emit('typing_stop', { senderId: userId });
    });

    socket.on('disconnect', async () => {
      delete userSocketMap[userId];
      await User.findByIdAndUpdate(userId, {
        status: 'offline',
        lastSeen: new Date(),
      });
      console.log('User disconnected:', userId);
    });
  });
}; 

const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const Call = require('../models/Call');

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

    // ─── CHAT ───────────────────────────────────────────
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

    // ─── WEBRTC SIGNALING ────────────────────────────────
    socket.on('call_offer', async (data) => {
      const { calleeId, offer, callType } = data;
      const calleeSocketId = userSocketMap[calleeId];

      // Save call record
      const call = new Call({
        participants: [userId, calleeId],
        type: callType || 'video',
        startTime: new Date(),
      });
      await call.save();

      if (calleeSocketId) {
        io.to(calleeSocketId).emit('call_offer', {
          callerId: userId,
          offer,
          callType,
          callId: call._id,
        });
      } else {
        // Callee offline — mark missed
        call.status = 'missed';
        await call.save();
        socket.emit('call_missed', { calleeId });
      }
    });

    socket.on('call_answer', (data) => {
      const { callerId, answer, callId } = data;
      const callerSocketId = userSocketMap[callerId];
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_answer', { answer, callId });
      }
    });

    socket.on('ice_candidate', (data) => {
      const { targetId, candidate } = data;
      const targetSocketId = userSocketMap[targetId];
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice_candidate', { candidate, senderId: userId });
      }
    });

    socket.on('call_end', async (data) => {
      const { targetId, callId } = data;
      const targetSocketId = userSocketMap[targetId];
      if (targetSocketId) {
        io.to(targetSocketId).emit('call_end', { senderId: userId });
      }
      if (callId) {
        await Call.findByIdAndUpdate(callId, {
          status: 'answered',
          endTime: new Date(),
        });
      }
    });

    socket.on('call_reject', async (data) => {
      const { callerId, callId } = data;
      const callerSocketId = userSocketMap[callerId];
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_rejected', { calleeId: userId });
      }
      if (callId) {
        await Call.findByIdAndUpdate(callId, { status: 'rejected' });
      }
    });

    // ─── DISCONNECT ──────────────────────────────────────
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
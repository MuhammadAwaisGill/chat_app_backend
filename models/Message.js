const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    text: { type: String },
    fileUrl: { type: String },
    fileType: { type: String },
    fileName: { type: String },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    delivered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema); 

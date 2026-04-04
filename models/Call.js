const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    type: { type: String, enum: ['audio', 'video'], required: true },
    status: { type: String, enum: ['missed', 'answered', 'rejected'], default: 'missed' },
    startTime: { type: Date },
    endTime: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Call', callSchema); 

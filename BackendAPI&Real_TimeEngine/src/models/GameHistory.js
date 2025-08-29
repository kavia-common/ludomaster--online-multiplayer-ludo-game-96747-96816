import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  placement: Number, // 1..4
  score: Number
}, { _id: false });

const GameHistorySchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  startedAt: Date,
  endedAt: Date,
  participants: [ParticipantSchema],
  mode: { type: String, enum: ['single', 'multiplayer'], default: 'multiplayer' }
}, { timestamps: true });

export default mongoose.model('GameHistory', GameHistorySchema);

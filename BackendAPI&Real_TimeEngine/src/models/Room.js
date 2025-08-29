import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  seat: Number, // 0..3
  color: { type: String, enum: ['red', 'green', 'yellow', 'blue'] }
}, { _id: false });

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  password: { type: String }, // hashed if present
  hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  players: { type: [PlayerSchema], default: [] },
  maxPlayers: { type: Number, default: 4, min: 2, max: 4 },
  status: { type: String, enum: ['waiting', 'in_progress', 'finished'], default: 'waiting', index: true }
}, {
  timestamps: true
});

export default mongoose.model('Room', RoomSchema);

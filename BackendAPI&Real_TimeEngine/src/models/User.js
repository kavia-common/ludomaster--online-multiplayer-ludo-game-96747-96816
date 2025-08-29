import mongoose from 'mongoose';

const StatsSchema = new mongoose.Schema({
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 },
  rating: { type: Number, default: 1000 }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, index: true },
  username: { type: String, unique: true, required: true, index: true },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  stats: { type: StatsSchema, default: () => ({}) }
}, {
  timestamps: true
});

export default mongoose.model('User', UserSchema);

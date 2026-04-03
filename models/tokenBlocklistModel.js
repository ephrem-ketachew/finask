import mongoose from 'mongoose';

const tokenBlocklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: process.env.JWT_EXPIRES_IN,
  },
});

const TokenBlocklist = mongoose.model('TokenBlocklist', tokenBlocklistSchema);

export default TokenBlocklist;

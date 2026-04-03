import mongoose from 'mongoose';

const systemCacheSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: [mongoose.Schema.ObjectId],
    default: [],
  },
  lastUpdated: {
    type: Date,
  },
});

const SystemCache = mongoose.model('SystemCache', systemCacheSchema);
export default SystemCache;

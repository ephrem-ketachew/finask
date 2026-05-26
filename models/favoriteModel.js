import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A favorite must belong to a user.'],
    },
    item: {
      type: mongoose.Schema.ObjectId,
      required: [true, 'A favorite must have an item.'],
      refPath: 'onModel',
    },
    onModel: {
      type: String,
      required: [true, 'The model of the item is required.'],
      enum: ['University', 'Program', 'City', 'Campus', 'Celebrity'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

favoriteSchema.index({ user: 1, item: 1, onModel: 1 }, { unique: true });

const Favorite = mongoose.model('Favorite', favoriteSchema);

export default Favorite;

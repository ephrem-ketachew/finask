import mongoose from 'mongoose';
import { updateParentOnDelete } from '../utils/schemaPlugins.js';

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      trim: true,
      required: [true, 'A review is required'],
      minlength: [10, 'A review must be at least 10 characters'],
      maxlength: [2000, 'A review must not exceed 2000 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'A review must have a rating.'],
      min: [1, 'Rating cannot be less than 1'],
      max: [5, 'Rating cannot be greater than 5'],
    },
    likes: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user'],
    },
    onModelId: {
      type: mongoose.Schema.ObjectId,
      required: true,
      refPath: 'onModelType',
    },
    onModelType: {
      type: String,
      required: true,
      enum: ['University', 'City', 'Campus', 'Program'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ onModelId: 1, onModelType: 1, user: 1 }, { unique: true });

reviewSchema.index({ onModelId: 1, onModelType: 1 });

reviewSchema.virtual('likesCount').get(function () {
  return this.likes.length;
});

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'firstName lastName profileImage headline',
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (
  parentId,
  parentModelName
) {
  const ParentModel = mongoose.model(parentModelName);

  if (
    !ParentModel.schema.path('ratingsAverage') ||
    !ParentModel.schema.path('ratingsQuantity')
  ) {
    // console.log(
    //   `Model ${parentModelName} does not have rating fields. Skipping calculation.`
    // );
    return;
  }

  const stats = await this.aggregate([
    {
      $match: { onModelId: parentId, onModelType: parentModelName },
    },
    {
      $group: {
        _id: '$onModelId',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await ParentModel.findByIdAndUpdate(parentId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await ParentModel.findByIdAndUpdate(parentId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.onModelId, this.onModelType);
});

reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.onModelId, doc.onModelType);
  }
});

reviewSchema.plugin(updateParentOnDelete, {
  staticMethodName: 'calcAverageRatings',
  polymorphic: true,
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;

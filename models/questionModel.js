import mongoose from 'mongoose';
import { cascadeDelete, updateParentOnDelete } from '../utils/schemaPlugins.js';

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question text is required.'],
      trim: true,
      minlength: [10, 'A question must have at least 10 characters.'],
      maxlength: [500, 'A question cannot exceed 500 characters.'],
    },
    likes: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    replyCount: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A question must belong to a user.'],
    },
    // --- POLYMORPHIC ASSOCIATION FIELDS ---
    onModelId: {
      type: mongoose.Schema.ObjectId,
      required: true,
      refPath: 'onModelType',
    },
    onModelType: {
      type: String,
      required: true,
      enum: ['University', 'City', 'Campus', 'Program', 'Celebrity'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- INDEXES ---
// Index for faster lookups when finding questions for a specific parent item.
questionSchema.index({ onModelId: 1, onModelType: 1 });

// --- VIRTUALS & MIDDLEWARE ---
questionSchema.virtual('likesCount').get(function () {
  return this.likes.length;
});

questionSchema.virtual('replies', {
  ref: 'Reply',
  foreignField: 'question',
  localField: '_id',
});

questionSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'firstName lastName profileImage headline',
  });
  next();
});

// --- STATIC METHODS ---
questionSchema.statics.updateQuestionCount = async function (
  parentId,
  parentModelName
) {
  const ParentModel = mongoose.model(parentModelName);

  // Defensive check: only update count if the parent model has the field.
  if (!ParentModel.schema.path('questionCount')) {
    // console.log(
    //   `Model ${parentModelName} does not have a questionCount field. Skipping.`
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
        nQuestions: { $sum: 1 },
      },
    },
  ]);

  const questionCount = stats.length > 0 ? stats[0].nQuestions : 0;

  await ParentModel.findByIdAndUpdate(parentId, {
    questionCount: questionCount,
  });
};

// --- HOOKS FOR QUESTION COUNT CALCULATION ---
questionSchema.post('save', function () {
  this.constructor.updateQuestionCount(this.onModelId, this.onModelType);
});

questionSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.updateQuestionCount(doc.onModelId, doc.onModelType);
  }
});

// --- PLUGINS ---
// This question model is a PARENT to replies, so it needs the cascade delete plugin.
questionSchema.plugin(cascadeDelete, {
  children: [{ model: 'Reply', foreignKey: 'question' }],
});

// --- PLUGINS ---
questionSchema.plugin(updateParentOnDelete, {
  staticMethodName: 'updateQuestionCount',
  polymorphic: true,
});

const Question = mongoose.model('Question', questionSchema);
export default Question;

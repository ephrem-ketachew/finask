import mongoose from 'mongoose';
import Question from './questionModel.js';
import { updateParentOnDelete } from '../utils/schemaPlugins.js';

const replySchema = new mongoose.Schema(
  {
    reply: {
      type: String,
      trim: true,
      required: [true, 'A reply cannot be empty.'],
      minlength: [1, 'A reply must have at least 1 character.'],
      maxlength: [2000, 'A reply must not exceed 2000 characters.'],
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
      required: [true, 'A reply must belong to a user.'],
    },
    question: {
      type: mongoose.Schema.ObjectId,
      ref: 'Question',
      required: [true, 'A reply must belong to a question.'],
    },
    mentions: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- INDEXES ---
// Index for faster lookups when finding replies for a question.
replySchema.index({ question: 1 });

// --- VIRTUALS & MIDDLEWARE ---
replySchema.virtual('likesCount').get(function () {
  return this.likes.length;
});

replySchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'firstName lastName profileImage headline',
  });
  next();
});

// --- STATIC METHODS ---
replySchema.statics.updateReplyCount = async function (questionId) {
  // Defensive check in case a question is deleted but a reply hook still fires
  if (!questionId) return;

  const stats = await this.aggregate([
    {
      $match: { question: questionId },
    },
    {
      $group: {
        _id: '$question',
        nReplies: { $sum: 1 },
      },
    },
  ]);

  const replyCount = stats.length > 0 ? stats[0].nReplies : 0;

  await Question.findByIdAndUpdate(questionId, {
    replyCount: replyCount,
  });
};

// --- HOOKS FOR REPLY COUNT CALCULATION ---
replySchema.post('save', function () {
  this.constructor.updateReplyCount(this.question);
});

replySchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.updateReplyCount(doc.question);
  }
});

replySchema.plugin(updateParentOnDelete, {
  staticMethodName: 'updateReplyCount',
  foreignKey: 'question',
});

const Reply = mongoose.model('Reply', replySchema);

export default Reply;

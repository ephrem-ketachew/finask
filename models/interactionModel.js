import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema(
  {
    university: {
      type: mongoose.Schema.ObjectId,
      ref: 'University',
      required: [true, 'Interaction must belong to a university.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    eventType: {
      type: String,
      enum: [
        'favoriteUniversity',
        'createReview',
        'clickOfficialWebsite',
        'createQuestion',
        'viewCampusDetails',
        'viewUniversityProfile',
        'clickSocialLink',
      ],
      required: [true, 'Interaction must have an event type.'],
    },
  },
  { timestamps: true }
);

interactionSchema.index({ createdAt: -1 });

const Interaction = mongoose.model('Interaction', interactionSchema);

export default Interaction;

import mongoose from 'mongoose';
import {
  createCloudImageUrlField,
  createDomainSpecificLink,
  createNameField,
  createRequiredString,
  optionalStringField,
} from '../utils/schemaHelpers.js';
import {
  slugGenerator,
  cloudinaryImageCleanup,
  cascadeDelete,
} from '../utils/schemaPlugins.js';

const celebritySchema = new mongoose.Schema(
  {
    name: createNameField('Celebrity', { unique: true }),
    slug: {
      type: String,
      trim: true,
    },
    profileImage: createCloudImageUrlField('Profile Image'),
    coverImage: createCloudImageUrlField('Cover Image'),

    // --- Personal Details ---
    birthday: { type: Date, required: [true, 'Birthday is required.'] },
    birthplace: createRequiredString('Birthplace'),
    deathday: { type: Date }, // Optional
    deathplace: optionalStringField, // Optional
    nationality: createRequiredString('Nationality'),

    // --- Professional Details ---
    notablePosition: createRequiredString('Notable Position'),
    tags: [
      {
        // Free-form fields of expertise
        type: String,
        trim: true,
      },
    ],

    // --- Content Sections ---
    bio: createRequiredString('Biography'),
    wikipediaLink: createDomainSpecificLink('Wikipedia', ['wikipedia.org'], {
      required: true,
    }),
    education: [createRequiredString('Education entry')],
    careerHighlights: [createRequiredString('Career highlight')],
    legacyImpact: [createRequiredString('Legacy and impact entry')],
    family: optionalStringField,

    // --- Linked Content ---
    // Powers the "Be like them" section
    recommendedPrograms: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Program',
      },
    ],

    // --- Standard Fields for Consistency ---
    questionCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Virtuals for Reviews & Questions ---
celebritySchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'celebrity',
  localField: '_id',
});

celebritySchema.virtual('questions', {
  ref: 'Question',
  foreignField: 'celebrity',
  localField: '_id',
});

// --- Plugins ---
celebritySchema.plugin(slugGenerator);
celebritySchema.plugin(cloudinaryImageCleanup);
celebritySchema.plugin(cascadeDelete, {
  children: [{ model: 'Question', polymorphic: true }],
});

const Celebrity = mongoose.model('Celebrity', celebritySchema);

export default Celebrity;

// class Celebrity {
//   Celebrity({
//   final String id;
//   final String name;
//   final String profileImage;
//   final DateTime birthday;
//   final String birthplace;
//   final DateTime deathday;
//   final String deathplace;
//   final String nationality;
//   final String notablePosition;
//   final List<String> fieldsOfExpertise;
//   final String bio;
//   final String wikipediaLink;
//   final List<String> education;
//   final List<String> career;
//   final List<String> legacy;
//   final String family;
//   final List<Program> recommendedPrograms;
// }

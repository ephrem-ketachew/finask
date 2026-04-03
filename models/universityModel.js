import mongoose from 'mongoose';
import { addressSchema, createContactsSchema } from './sharedSchemas.js';
import {
  createCloudImageUrlField,
  createDomainSpecificLink,
  createGeoLocationField,
  createNameField,
  createRatingsAverageField,
  createRequiredString,
  createTagsField,
  createYearField,
  nonNegativeCountField,
} from '../utils/schemaHelpers.js';
import {
  slugGenerator,
  cloudinaryImageCleanup,
  cascadeDelete,
} from '../utils/schemaPlugins.js';

const GENERATIONAL_TAGS = [
  'firstGeneration',
  'secondGeneration',
  'thirdGeneration',
  'fourthGeneration',
];

const TYPE_TAGS = ['research', 'general', 'specialized', 'applied'];

const SPECIAL_TAGS = ['top10', 'new', 'historic', 'autonomous'];

const ALL_ORIGINAL_TAGS = [...GENERATIONAL_TAGS, ...TYPE_TAGS, ...SPECIAL_TAGS];

const ALL_TAGS = ALL_ORIGINAL_TAGS.map((tag) => tag.toLowerCase());

const TAG_DISPLAY_NAMES = ALL_ORIGINAL_TAGS.reduce((acc, tag) => {
  const storedValue = tag.toLowerCase();
  const spaced = tag.replace(/([A-Z])/g, ' $1');
  acc[storedValue] = spaced.charAt(0).toUpperCase() + spaced.slice(1);

  return acc;
}, {});

export const UNIVERSITY_GALLERY_OPTIONS = {
  maxLength: 10,
};

const rankFieldDefinition = {
  type: Number,
  min: [1, 'Rank must be a positive integer.'],
  validate: {
    validator: Number.isInteger,
    message: 'Rank must be an integer.',
  },
  default: null,
};

const socialLinksSchema = new mongoose.Schema(
  {
    telegram: createDomainSpecificLink('Telegram', ['t.me', 'telegram.me']),
    linkedIn: createDomainSpecificLink('LinkedIn', ['linkedin.com']),
    facebook: createDomainSpecificLink('Facebook', ['facebook.com']),
    youtube: createDomainSpecificLink('YouTube', ['youtube.com', 'youtu.be']),
    instagram: createDomainSpecificLink('Instagram', ['instagram.com']),
    tiktok: createDomainSpecificLink('TikTok', ['tiktok.com']),
    x: createDomainSpecificLink('X (Twitter)', ['twitter.com', 'x.com']),
  },
  {
    _id: false,
  }
);

const singleRankSourceSchema = new mongoose.Schema(
  {
    ethiopiaRank: rankFieldDefinition,
    ethiopiaTotal: nonNegativeCountField,
    africaRank: rankFieldDefinition,
    africaTotal: nonNegativeCountField,
    worldRank: rankFieldDefinition,
    worldTotal: nonNegativeCountField,
    year: {
      type: Number,
      required: [true, 'The ranking year is required.'],
    },
    sourceUrl: createDomainSpecificLink(
      'Source URL',
      ['4icu.org', 'edurank.org'],
      { required: false }
    ),
  },
  { _id: false }
);

const rankSchema = new mongoose.Schema(
  {
    eduRank: singleRankSourceSchema,
    uniRank: singleRankSourceSchema,
  },
  { _id: false }
);

const academicProfileSchema = new mongoose.Schema(
  {
    abbreviation: {
      type: String,
      trim: true,
      maxlength: [10, 'Abbreviation cannot exceed 10 characters'],
      default: '',
    },
    yearFounded: createYearField({ fieldName: 'Year founded' }),
    undergraduateProgramsCount: nonNegativeCountField,
    graduatesCount: nonNegativeCountField,
    numberOfCampuses: nonNegativeCountField,
  },
  { _id: false }
);

const universitySchema = new mongoose.Schema(
  {
    name: createNameField('University', { unique: true }),

    slug: {
      type: String,
      trim: true,
    },

    coverImage: createCloudImageUrlField('Cover Image'),
    images: createCloudImageUrlField('Gallery Image', {
      isArray: true,
      maxLength: UNIVERSITY_GALLERY_OPTIONS.maxLength,
    }),

    overview: createRequiredString('An overview'),
    bestKnownFor: [
      {
        type: String,
        trim: true,
      },
    ],
    wikipediaLink: createDomainSpecificLink('Wikipedia', ['wikipedia.org'], {
      required: true,
    }),

    city: {
      type: mongoose.Schema.ObjectId,
      ref: 'City',
      required: [true, 'A university must belong to a city.'],
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    academicProfile: academicProfileSchema,
    rank: rankSchema,
    socialLinks: socialLinksSchema,

    tags: createTagsField(ALL_TAGS),
    location: createGeoLocationField(),

    address: addressSchema,
    contacts: createContactsSchema({ isWebsiteRequired: true }),

    ratingsAverage: createRatingsAverageField(),
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    questionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

universitySchema.virtual('tagsDisplayNames').get(function () {
  if (!this.tags || !Array.isArray(this.tags)) {
    return [];
  }
  return this.tags.map((tag) => TAG_DISPLAY_NAMES[tag] || tag);
});

universitySchema.virtual('campuses', {
  ref: 'Campus',
  foreignField: 'university',
  localField: '_id',
});

universitySchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'onModelId',
  localField: '_id',
  match: { onModelType: 'University' },
});

universitySchema.virtual('questions', {
  ref: 'Question',
  foreignField: 'onModelId',
  localField: '_id',
  match: { onModelType: 'University' },
});

universitySchema.virtual('programOfferings', {
  ref: 'UniversityProgram',
  foreignField: 'university',
  localField: '_id',
});

universitySchema.virtual('primaryRank').get(function () {
  return this.rank?.eduRank || null;
});

universitySchema.index({ city: 1 });

universitySchema.plugin(slugGenerator);
universitySchema.plugin(cloudinaryImageCleanup);
universitySchema.plugin(cascadeDelete, {
  children: [
    { model: 'Review', polymorphic: true },
    { model: 'Question', polymorphic: true },
  ],
});

universitySchema.methods.postDeleteCleanup = async function () {
  const Review = mongoose.model('Review');
  await Review.calcAverageRatings(this._id, this.constructor.modelName);
};

const University = mongoose.model('University', universitySchema);

export default University;

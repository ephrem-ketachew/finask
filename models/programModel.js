import mongoose from 'mongoose';
import {
  createCloudImageUrlField,
  createDomainSpecificLink,
  createNameField,
  createRatingsAverageField,
  createRequiredString,
  createTagsField,
  nonNegativeCountField,
  toStandardLowercase,
} from '../utils/schemaHelpers.js';
import {
  slugGenerator,
  cloudinaryImageCleanup,
  cascadeDelete,
} from '../utils/schemaPlugins.js';

export const PROGRAM_GALLERY_OPTIONS = {
  maxLength: 10,
};

const FIELD_DISPLAY_NAMES = {
  engineeringarchitecture: 'Engineering and Architecture',
  medicinehealth: 'Medicine and Health',
  businesseconomics: 'Business and Economics',
  technologyit: 'Technology and IT',
  humanitiesartslanguages: 'Humanities, Arts and Languages',
  naturalappliedsciences: 'Natural and Applied Sciences',
  socialscienceslaw: 'Social Sciences and Law',
  educationteaching: 'Education and Teaching',
};

const ACADEMIC_FOCUS_TAGS = [
  'analytical',
  'creative',
  'mathHeavy',
  'researchOriented',
  'problemSolving',
];

// Career Outlook
const CAREER_OUTLOOK_TAGS = [
  'inDemand',
  'highEarningPotential',
  'entrepreneurial',
  'publicService',
  'professionalDegree',
];

// Learning Style & Structure
const LEARNING_STYLE_TAGS = [
  'handsOn',
  'theoryHeavy',
  'fieldworkBased',
  'collaborative',
];

// Program Attributes
const PROGRAM_ATTRIBUTES_TAGS = [
  'interdisciplinary',
  'emergingField',
  'competitiveEntry',
  'foundational',
  'specialized',
];

const ALL_ORIGINAL_TAGS = [
  ...ACADEMIC_FOCUS_TAGS,
  ...CAREER_OUTLOOK_TAGS,
  ...LEARNING_STYLE_TAGS,
  ...PROGRAM_ATTRIBUTES_TAGS,
];

const ALL_PROGRAM_TAGS = ALL_ORIGINAL_TAGS.map((tag) => tag.toLowerCase());

export const TAG_DISPLAY_NAMES = ALL_ORIGINAL_TAGS.reduce((acc, tag) => {
  const storedValue = tag.toLowerCase();

  const spaced = tag.replace(/([A-Z])/g, ' $1');
  const displayValue = spaced.charAt(0).toUpperCase() + spaced.slice(1);

  acc[storedValue] = displayValue;
  return acc;
}, {});

const FIELDS = Object.keys(FIELD_DISPLAY_NAMES);

const createFieldSchema = () => ({
  type: String,
  required: [true, 'The field is required.'],
  set: toStandardLowercase,
  validate: {
    validator: (cleanedValue) => FIELDS.includes(cleanedValue),
    message: 'Invalid field: {VALUE} is not a valid field.',
  },
});

const programSchema = new mongoose.Schema(
  {
    name: createNameField('Program', { unique: true }),
    duration: nonNegativeCountField,

    slug: {
      type: String,
      trim: true,
    },

    coverImage: createCloudImageUrlField('Cover Image'),
    images: createCloudImageUrlField('Gallery Image', {
      isArray: true,
      maxLength: PROGRAM_GALLERY_OPTIONS.maxLength,
    }),

    overview: createRequiredString('An overview'),

    tags: createTagsField(ALL_PROGRAM_TAGS),

    wikipediaLink: createDomainSpecificLink('Wikipedia', ['wikipedia.org'], {
      required: true,
    }),

    field: createFieldSchema(),

    careerPaths: [createRequiredString('Career Path')],
    courses: [createRequiredString('Courses')],
    skills: [createRequiredString('Skills')],

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

programSchema.virtual('fieldDisplayName').get(function () {
  return this.field ? FIELD_DISPLAY_NAMES[this.field] : null;
});

programSchema.virtual('tagsDisplayNames').get(function () {
  if (!this.tags || !Array.isArray(this.tags)) {
    return [];
  }
  return this.tags.map((tag) => TAG_DISPLAY_NAMES[tag] || tag);
});

programSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'onModelId',
  localField: '_id',
  match: { onModelType: 'Program' },
});

programSchema.virtual('questions', {
  ref: 'Question',
  foreignField: 'onModelId',
  localField: '_id',
  match: { onModelType: 'Program' },
});

programSchema.virtual('universityOfferings', {
  ref: 'UniversityProgram',
  foreignField: 'program',
  localField: '_id',
});

programSchema.plugin(slugGenerator);
programSchema.plugin(cloudinaryImageCleanup);
programSchema.plugin(cascadeDelete, {
  children: [
    { model: 'Review', polymorphic: true },
    { model: 'Question', polymorphic: true },
  ],
});

programSchema.methods.postDeleteCleanup = async function () {
  const Review = mongoose.model('Review');
  await Review.calcAverageRatings(this._id, this.constructor.modelName);
};

const Program = mongoose.model('Program', programSchema);

export default Program;

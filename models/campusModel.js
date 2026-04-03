import mongoose from 'mongoose';
import { addressSchema, createContactsSchema } from './sharedSchemas.js';
import {
  createCloudImageUrlField,
  createDistanceField,
  createDomainSpecificLink,
  createNameField,
  createRatingsAverageField,
  createRequiredString,
  createGeoLocationField,
} from '../utils/schemaHelpers.js';
import {
  slugGenerator,
  cloudinaryImageCleanup,
  cascadeDelete,
} from '../utils/schemaPlugins.js';
import { getDistance } from 'geolib';

export const CAMPUS_GALLERY_OPTIONS = {
  maxLength: 10,
};

const campusSchema = new mongoose.Schema(
  {
    name: createNameField('Campus'),
    slug: {
      type: String,
      trim: true,
    },

    university: {
      type: mongoose.Schema.ObjectId,
      ref: 'University',
      required: [true, 'A campus must belong to a university.'],
    },

    programs: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Program',
      },
    ],

    coverImage: createCloudImageUrlField('Cover Image'),
    images: createCloudImageUrlField('Gallery Image', {
      isArray: true,
      maxLength: CAMPUS_GALLERY_OPTIONS.maxLength,
    }),

    distanceFromMainCampus: createDistanceField(),

    overview: createRequiredString('An overview'),
    wikipediaLink: createDomainSpecificLink('Wikipedia', ['wikipedia.org']),

    location: createGeoLocationField(),

    address: addressSchema,
    contacts: createContactsSchema(),

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

campusSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'onModelId',
  localField: '_id',
  match: { onModelType: 'Campus' },
});

campusSchema.virtual('questions', {
  ref: 'Question',
  foreignField: 'onModelId',
  localField: '_id',
  match: { onModelType: 'Campus' },
});

campusSchema.index({ university: 1, name: 1 }, { unique: true });

campusSchema.plugin(slugGenerator);
campusSchema.plugin(cloudinaryImageCleanup);
campusSchema.plugin(cascadeDelete, {
  children: [
    { model: 'Review', polymorphic: true },
    { model: 'Question', polymorphic: true },
  ],
});

campusSchema.pre('save', async function (next) {
  if (this.isModified('location') && this.location?.coordinates) {
    const University = mongoose.model('University');
    const parentUniversity = await University.findById(this.university);

    if (!parentUniversity?.location?.coordinates) {
      console.error(
        `Could not find parent university or its location for campus ${this._id}`
      );
      return next();
    }

    const mainCampusCoords = {
      latitude: parentUniversity.location.coordinates[1],
      longitude: parentUniversity.location.coordinates[0],
    };

    const thisCampusCoords = {
      latitude: this.location.coordinates[1],
      longitude: this.location.coordinates[0],
    };

    const distanceInMeters = getDistance(mainCampusCoords, thisCampusCoords);
    this.distanceFromMainCampus = Math.round(distanceInMeters / 1000);
  }
  next();
});

campusSchema.methods.postDeleteCleanup = async function () {
  const Review = mongoose.model('Review');
  await Review.calcAverageRatings(this._id, this.constructor.modelName);
};

const Campus = mongoose.model('Campus', campusSchema);

export default Campus;

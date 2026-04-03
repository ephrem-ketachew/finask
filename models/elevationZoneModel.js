import mongoose from 'mongoose';
import {
  createCloudImageUrlField,
  createNonNegativeNumberField,
  createRequiredString,
  createValidatedMaxField,
  temperatureField,
} from '../utils/schemaHelpers.js';
import {
  cloudinaryImageCleanup,
  slugGenerator,
} from '../utils/schemaPlugins.js';

export const ELEVATION_GALLERY_OPTIONS = {
  maxLength: 10,
};

const ELEVATION_ZONE_NAMES = ['dega', 'weynadega', 'kolla', 'berha', 'wurch'];

const elevationZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'An elevation zone name is required.'],
      unique: true,
      enum: {
        values: ELEVATION_ZONE_NAMES,
        message: '{VALUE} is not a supported elevation zone.',
      },
      set: (v) => v.toLowerCase().trim(),
    },
    subtitle: createRequiredString('Subtitle'),
    slug: {
      type: String,
      trim: true,
    },

    minRainfall: createNonNegativeNumberField('Rainfall'),
    maxRainfall: createValidatedMaxField(
      createNonNegativeNumberField('Rainfall'),
      'minRainfall',
      'rainfall'
    ),

    minElevation: Number,
    maxElevation: createValidatedMaxField(
      createNonNegativeNumberField('Elevation'),
      'minElevation',
      'elevation'
    ),

    minTemperature: temperatureField,
    maxTemperature: createValidatedMaxField(
      temperatureField,
      'minTemperature',
      'temperature'
    ),

    coverImage: createCloudImageUrlField('Cover Image'),
    images: createCloudImageUrlField('Gallery Image', {
      isArray: true,
      maxLength: ELEVATION_GALLERY_OPTIONS.maxLength,
    }),

    overview: createRequiredString('An overview'),
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

elevationZoneSchema.virtual('displayName').get(function () {
  if (this.name) {
    if (this.name === 'weynadega') return 'Weyna Dega';
    return this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }
  return null;
});

elevationZoneSchema.virtual('cities', {
  ref: 'City',
  foreignField: 'climate.elevationZone',
  localField: '_id',
});

elevationZoneSchema.plugin(slugGenerator);
elevationZoneSchema.plugin(cloudinaryImageCleanup);

const ElevationZone = mongoose.model('ElevationZone', elevationZoneSchema);

export default ElevationZone;

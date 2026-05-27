import mongoose from 'mongoose';
import geolib from 'geolib';
import validator from 'validator';
import {
  createCloudImageUrlField,
  createDistanceField,
  createDomainSpecificLink,
  createGeoLocationField,
  createMonthField,
  createNameField,
  createNonNegativeNumberField,
  createRatingsAverageField,
  createRequiredString,
  createTagsField,
  createValidatedMaxField,
  nonNegativeCountField,
  temperatureField,
  toStandardLowercase,
} from '../utils/schemaHelpers.js';
import {
  cascadeDelete,
  cloudinaryImageCleanup,
  slugGenerator,
} from '../utils/schemaPlugins.js';

const { getDistance, decimalToSexagesimal } = geolib;
const { isPostalCode } = validator;

const HISTORICAL_CULTURAL_TAGS = [
  'historic',
  'ancient',
  'cultural',
  'touristAttraction',

  'ruralTown',
  'smallTown',
  'mediumTown',
  'largeTown',
  'city',
  'metropolis',

  'regionalCapital',
  'capitalCity',
  'urbanCenter',
  'metropolitan',
  'nearAA',
  'remote',
];

const CITY_CHARACTER_TAGS = [
  'busy',
  'calm',
  'peaceful',
  'politicallyStable',
  'growingCity',
  'affordable',
  'expensive',
  'airport',
];

const CITY_CLIMATE_TAGS = [
  'extremelyHot',
  'hot',
  'arid',
  'warm',
  'mild',
  'cool',
  'cold',
  'rainy',
  'dry',
  'wet',
  'humid',
  'windy',
  'semiArid',
  'tropical',
  'subtropical',
  'temperate',
  'moderate',
  'hotArid',
];

const CITY_GEOGRAPHY_TAGS = ['lowland', 'highland'];

const CITY_ETHIOPIAN_ZONE_TAGS = [
  'dega',
  'weynaDega',
  'kolla',
  'berha',
  'wurch',
];

const ALL_ORIGINAL_TAGS = [
  ...HISTORICAL_CULTURAL_TAGS,
  ...CITY_CHARACTER_TAGS,
  ...CITY_CLIMATE_TAGS,
  ...CITY_GEOGRAPHY_TAGS,
  ...CITY_ETHIOPIAN_ZONE_TAGS,
];

const ALL_CITY_TAGS = ALL_ORIGINAL_TAGS.map((tag) => tag.toLowerCase());

export const ADDIS_ABABA_COORDS = { latitude: 9.02497, longitude: 38.74689 };

export const CITY_GALLERY_OPTIONS = {
  maxLength: 10,
};

const TAG_DISPLAY_NAMES = ALL_ORIGINAL_TAGS.reduce((acc, tag) => {
  const storedValue = tag.toLowerCase();

  let displayValue;

  if (tag === 'nearAA') {
    displayValue = 'Near Addis Ababa';
  } else {
    const spaced = tag.replace(/([A-Z])/g, ' $1');
    displayValue = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  acc[storedValue] = displayValue;
  return acc;
}, {});

const REGION_DISPLAY_NAMES = {
  addis: 'Addis Ababa',
  afar: 'Afar',
  amhara: 'Amhara',
  benishangul: 'Benishangul-Gumuz',
  cers: 'Central Ethiopia Regional State',
  dire: 'Dire Dawa',
  gambella: 'Gambella',
  harari: 'Harari',
  oromia: 'Oromia',
  sidama: 'Sidama',
  sers: 'South Ethiopia Regional State',
  somali: 'Somali',
  swepr: "South West Ethiopia Peoples' Region",
  tigray: 'Tigray',
};

const ETHIOPIAN_REGIONS = Object.keys(REGION_DISPLAY_NAMES);

const createRegionField = () => ({
  type: String,
  required: [true, 'The region is required.'],
  set: toStandardLowercase,
  validate: {
    validator: (cleanedValue) => ETHIOPIAN_REGIONS.includes(cleanedValue),
    message: 'Invalid region: {VALUE} is not a valid Ethiopian region.',
  },
});

const cityProfileSchema = new mongoose.Schema(
  {
    population: nonNegativeCountField,
    distanceFromCapital: createDistanceField(),

    hasAirport: {
      type: Boolean,
      default: false,
    },
    elevation: {
      type: Number,
      min: [-500, 'Elevation seems invalid'],
      default: 0,
    },

    language: createRequiredString('Language'),
    transportOptions: [createRequiredString('Transport')],
    postCode: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => isPostalCode(value, 'any'),
        message: (props) => `${props.value} is not a valid postal code.`,
      },
    },
    area: createNonNegativeNumberField('Area'),
  },
  {
    _id: false,
  }
);

const webLinkSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A name for the web link is required.'],
      trim: true,
    },
    url: createDomainSpecificLink(
      'Weather Website',
      ['weatherspark.com', 'timeanddate.com'],
      { required: true }
    ),
  },
  { _id: false }
);

const createMonthlyStatField = (valueLabel) => ({
  month: createMonthField({ required: true }),
  value: {
    type: Number,
    required: [true, `The average ${valueLabel} value is required.`],
  },
});

const climateSchema = new mongoose.Schema(
  {
    elevationZone: {
      type: mongoose.Schema.ObjectId,
      ref: 'ElevationZone',
      required: [true, 'A city must have an elevation zone.'],
    },
    climateTag: createRequiredString('A climate tag'),
    detail: createRequiredString('Detail'),
    summary: createRequiredString('Summary'),
    hottestMonth: createMonthlyStatField('hottest temperature'),
    coldestMonth: createMonthlyStatField('coldest temperature'),
    wettestMonth: createMonthlyStatField('wettest precipitation'),
    windiestMonth: createMonthlyStatField('windiest wind speed'),
    annualPrecipitation: createNonNegativeNumberField('Annual percipitation'),
    climateWebLinks: [webLinkSchema],
    minTemperature: temperatureField,
    maxTemperature: createValidatedMaxField(
      temperatureField,
      'minTemperature',
      'temperature'
    ),
  },
  {
    _id: false,
  }
);

const touristAttractionSchema = new mongoose.Schema(
  {
    name: createNameField('Tourist attraction'),
    image: createCloudImageUrlField('Attraction Image'),
    detail: createRequiredString('Site detail'),
  },
  {
    _id: false,
  }
);

const flyFromCitySchema = new mongoose.Schema(
  {
    name: createNameField('Origin city'),
    airportCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [4, 'Airport code cannot exceed 4 characters'],
    },
    distanceKm: createNonNegativeNumberField('Distance in km'),
  },
  { _id: false }
);

const citySchema = new mongoose.Schema(
  {
    name: createNameField('City', { unique: true }),
    slug: {
      type: String,
      trim: true,
    },

    coverImage: createCloudImageUrlField('Cover Image'),
    images: createCloudImageUrlField('Gallery Image', {
      isArray: true,
      maxLength: CITY_GALLERY_OPTIONS.maxLength,
    }),

    overview: createRequiredString('An overview'),
    wikipediaLink: createDomainSpecificLink('Wikipedia', ['wikipedia.org'], {
      required: true,
    }),
    tags: createTagsField(ALL_CITY_TAGS),
    region: createRegionField(),
    location: createGeoLocationField(),

    ratingsAverage: createRatingsAverageField(),
    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    climate: climateSchema,
    touristAttractions: [touristAttractionSchema],
    cityProfile: cityProfileSchema,

    flightOrigins: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    flyFromCities: [flyFromCitySchema],
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

citySchema.virtual('regionDisplayName').get(function () {
  return this.region ? REGION_DISPLAY_NAMES[this.region] : null;
});

citySchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'onModelId',
  localField: '_id',
  match: { onModelType: 'City' },
});

citySchema.virtual('questions', {
  ref: 'Question',
  foreignField: 'onModelId',
  localField: '_id',
  match: { onModelType: 'City' },
});

citySchema.virtual('universities', {
  ref: 'University',
  foreignField: 'city',
  localField: '_id',
});

citySchema.virtual('tagsDisplayNames').get(function () {
  if (!this.tags || !Array.isArray(this.tags)) {
    return [];
  }
  return this.tags.map((tag) => TAG_DISPLAY_NAMES[tag] || tag);
});

citySchema.virtual('absoluteLocation').get(function () {
  if (!this.location || !Array.isArray(this.location.coordinates)) {
    return null;
  }

  const [longitude, latitude] = this.location.coordinates;

  const latDirection = latitude >= 0 ? 'N' : 'S';
  const lonDirection = longitude >= 0 ? 'E' : 'W';

  const latSexagesimal = decimalToSexagesimal(latitude);
  const lonSexagesimal = decimalToSexagesimal(longitude);

  return `${latSexagesimal}${latDirection} ${lonSexagesimal}${lonDirection}`;
});

citySchema.plugin(slugGenerator);
citySchema.plugin(cloudinaryImageCleanup);
citySchema.plugin(cascadeDelete, {
  children: [
    { model: 'Review', polymorphic: true },
    { model: 'Question', polymorphic: true },
  ],
});

citySchema.pre('save', function (next) {
  if (this.isModified('location') && this.location?.coordinates) {
    const cityCoords = {
      latitude: this.location.coordinates[1],
      longitude: this.location.coordinates[0],
    };

    const distanceInMeters = getDistance(ADDIS_ABABA_COORDS, cityCoords);

    this.cityProfile.distanceFromCapital = Math.round(distanceInMeters / 1000);
  }
  next();
});

citySchema.methods.postDeleteCleanup = async function () {
  const Review = mongoose.model('Review');
  await Review.calcAverageRatings(this._id, this.constructor.modelName);
};

const City = mongoose.model('City', citySchema);

export default City;

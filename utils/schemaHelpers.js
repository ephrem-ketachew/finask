import validator from 'validator';

export const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

export const createMonthField = (options = {}) => {
  const definition = {
    type: String,
    enum: MONTHS,
    set: (v) => v?.toLowerCase().trim(),
  };

  if (options.required) {
    definition.required = [true, `${options.label || 'Month'} is required.`];
  }

  if (options.default) {
    definition.default = options.default.toLowerCase();
  }

  return definition;
};

export const createRequiredString = (fieldName) => ({
  type: String,
  required: [true, `${fieldName} is required.`],
  trim: true,
});

export const temperatureField = {
  type: Number,
  min: [-100, 'Temperature seems invalid'],
  max: [100, 'Temperature seems invalid'],
  default: null,
};

export const nonNegativeCountField = {
  type: Number,
  min: [0, 'Count cannot be negative'],
  validate: {
    validator: Number.isInteger,
    message: 'Count must be an integer',
  },
  default: 0,
};

export const createDomainSpecificLink = (
  platformName,
  validDomains = [],
  options = {}
) => {
  const definition = {
    type: String,
    trim: true,
    maxlength: [2048, 'URL is too long'],
  };

  if (options.required) {
    definition.required = [true, `A valid ${platformName} link is required.`];
  }

  definition.validate = {
    validator: function (url) {
      if (!options.required && !url) {
        return true;
      }
      if (options.required && !url) {
        return false;
      }
      try {
        const urlObject = new URL(url);
        return validDomains.some((domain) =>
          urlObject.hostname.endsWith(domain)
        );
      } catch {
        return false;
      }
    },
    message: `Please provide a valid ${platformName} URL.`,
  };

  return definition;
};

export const createCloudImageUrlField = (fieldName, options = {}) => {
  const definition = {
    type: String,
    trim: true,
    validate: {
      validator: function (url) {
        if (!options.required && !url) return true;
        return validator.isURL(url, { host_whitelist: ['res.cloudinary.com'] });
      },
      message: `Please provide a valid ${fieldName} URL from our image provider.`,
    },
  };

  if (options.required) {
    definition.required = [true, `A ${fieldName} is required.`];
  }

  if (options.isArray) {
    return {
      type: [definition],
      default: [],
      validate: [
        {
          validator: (arr) => arr.length <= (options.maxLength || 10),
          message: `You can upload a maximum of ${
            options.maxLength || 10
          } gallery images.`,
        },
        {
          validator: (arr) => new Set(arr).size === arr.length,
          message: 'Duplicate images are not allowed in the gallery.',
        },
        {
          validator: function (arr) {
            return options.minLength ? arr.length >= options.minLength : true;
          },
          message: `You must upload at least ${options.minLength} images.`,
        },
      ],
    };
  }

  return definition;
};

export const createGeoLocationField = (options = { isRequired: true }) => ({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
  },
  coordinates: {
    type: [Number],
    required: options.isRequired
      ? [true, 'Map coordinates are required.']
      : false,
    index: '2dsphere',
    validate: {
      validator: function (arr) {
        if (arr == null) {
          return true;
        }

        if (!Array.isArray(arr) || arr.length !== 2) {
          return false;
        }

        const [longitude, latitude] = arr;

        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
          return false;
        }

        const isLongitudeValid = longitude >= -180 && longitude <= 180;
        const isLatitudeValid = latitude >= -90 && latitude <= 90;

        return isLongitudeValid && isLatitudeValid;
      },
      message:
        'Coordinates must be an array of two finite numbers: [longitude, latitude] with valid geographical values.',
    },
  },
});

export const createGenericUrlField = (options = {}) => ({
  type: String,
  trim: true,
  maxlength: [2048, 'URL is too long'],
  required: options.required
    ? [true, 'A valid website URL is required.']
    : false,
  validate: {
    validator: (url) => {
      if (!options.required && !url) {
        return true;
      }
      return validator.isURL(url);
    },
    message: 'Please provide a valid URL.',
  },
});

export const toStandardLowercase = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim() // Remove leading/trailing spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces to one
    .toLowerCase(); // Convert to lowercase
};

export const optionalStringField = {
  type: String,
  trim: true,
  default: '',
};

export const createNameField = (entityName, options = {}) => {
  const { unique = false, minLength = 3, maxLength = 100 } = options;
  const entityNameLower = entityName.toLowerCase();

  const fieldDefinition = {
    type: String,
    required: [true, `A ${entityNameLower} name is required.`],
    maxLength: [
      maxLength,
      `The ${entityNameLower} name must not exceed ${maxLength} characters.`,
    ],
    minLength: [
      minLength,
      `The ${entityNameLower} name must be at least ${minLength} characters.`,
    ],
    trim: true,
  };

  if (unique) {
    fieldDefinition.unique = true;
  }

  return fieldDefinition;
};

export const createRatingsAverageField = () => ({
  type: Number,
  default: 4.5,
  min: [1, 'Rating must be above 1.0'],
  max: [5, 'Rating must be below 5.0'],
  set: (val) => Math.round(val * 10) / 10,
});

export const createDistanceField = () => ({
  type: Number,
  min: [0, 'Distance cannot be negative.'],
  max: [1700, 'Distance exceeds a valid range for the region.'],
  default: null,
});

export const createAnnualRainfallField = () => ({
  type: Number,
  min: [0, 'Annual rainfall cannot be negative.'],
  default: 0,
});

export const createTagsField = (allowedTags) => [
  {
    type: String,
    trim: true,
    lowercase: true,
    enum: {
      values: allowedTags,
      message: 'Invalid tag: {VALUE} is not a supported tag.',
    },
  },
];

export const createNonNegativeNumberField = (fieldName) => ({
  type: Number,
  min: [0, `${fieldName} cannot be negative.`],
  default: 0,
});

export const createValidatedMaxField = (
  baseFieldDefinition,
  minFieldName,
  entityName
) => {
  return {
    ...baseFieldDefinition,
    validate: {
      validator: function (value) {
        // 'this' refers to the document being validated
        if (value === null || value === undefined) return true;
        return this[minFieldName] == null || value >= this[minFieldName];
      },
      message: `Max ${entityName} must be greater than or equal to min ${entityName}.`,
    },
  };
};

export const createYearField = (options = {}) => {
  const { fieldName = 'Year', required = true, min = 1900 } = options;

  const fieldDefinition = {
    type: Number,
    min: [min, `${fieldName} must be a valid year.`],
    max: [new Date().getFullYear(), `${fieldName} cannot be in the future.`],
    validate: {
      validator: Number.isInteger,
      message: `${fieldName} must be an integer.`,
    },
  };

  if (required) {
    fieldDefinition.required = [true, `${fieldName} is required.`];
  }

  return fieldDefinition;
};

export const flexiblePhoneField = {
  type: String,
  trim: true,
  validate: {
    validator: function (phone) {
      if (!phone) return true;

      const validCharsRegex = /^[+\d\s()-]+$/;
      if (!validCharsRegex.test(phone)) {
        return false;
      }

      const digits = phone.replace(/[^\d]/g, '');
      return digits.length >= 9 && digits.length <= 13;
    },
    message: 'Please provide a valid phone number format.',
  },
};

export const emailField = {
  type: String,
  trim: true,
  lowercase: true,
  validate: [validator.isEmail, 'Please provide a valid email address.'],
};

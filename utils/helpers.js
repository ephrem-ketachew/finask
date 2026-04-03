import User from '../models/userModel.js';
import AppError from './appError.js';

export const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });

  return newObj;
};

/**
 * Checks if a value can be converted to a finite number.
 * @param {*} val The value to check.
 * @returns {boolean} True if the value is numeric.
 */
const isNumeric = (val) => {
  if (typeof val !== 'string' || val.trim() === '') return false;
  return !isNaN(parseFloat(val)) && isFinite(val);
};

/**
 * Recursively processes a query object to ensure values for specific
 * MongoDB operators have the correct data type (e.g., Array).
 * @param {object} obj The query object to process.
 * @returns {object} The mutated query object.
 */
export const processQueryOperators = (obj) => {
  // Define all operators that expect their value to be an array.
  // This is scalable! Just add new operators here in the future.
  const arrayOperators = ['$in', '$nin', '$all'];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === 'object' && value !== null) {
        // If the value is a nested object, recurse into it first.
        processQueryOperators(value);
      }

      if (value === 'true') {
        obj[key] = true;
      } else if (value === 'false') {
        obj[key] = false;
      } else if (isNumeric(value)) {
        obj[key] = parseFloat(value);
        continue; // Move to next key after conversion
      }

      //  Convert comma-separated strings to arrays for array operators ---
      if (arrayOperators.includes(key) && typeof value === 'string') {
        obj[key] = value.split(',');
      }
    }
  }
  return obj;
};

/**
 * Flattens a nested object into a single-level object with dot notation keys.
 * It intelligently avoids flattening MongoDB query operators (e.g., $gte, $in).
 * @param {object} obj - The object to flatten.
 * @param {string} [parentKey=''] - The base key for recursion (used internally).
 * @param {object} [result={}] - The accumulator object (used internally).
 * @returns {object} The flattened object.
 */
export const flattenObjectForMongoose = (obj, parentKey = '', result = {}) => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      const value = obj[key];

      const isObject =
        typeof value === 'object' && value !== null && !Array.isArray(value);

      if (isObject) {
        const subKeys = Object.keys(value);
        if (subKeys.length > 0 && subKeys[0].startsWith('$')) {
          result[newKey] = value;
        } else {
          flattenObjectForMongoose(value, newKey, result);
        }
      } else {
        result[newKey] = value;
      }
    }
  }
  return result;
};

/**
 * Parses text to find @-mentions and returns the corresponding user IDs.
 * @param {string} text - The text to parse.
 * @returns {Promise<string[]>} A promise that resolves to an array of unique user IDs.
 */
export const parseAndGetMentionedUserIds = async (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Regex to find all occurrences of @username (ensuring username is alphanumeric)
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = text.match(mentionRegex);

  if (!matches) {
    return []; // No mentions found
  }

  // Clean up usernames (remove '@' and get unique values)
  const usernames = [
    ...new Set(matches.map((mention) => mention.substring(1))),
  ];

  if (usernames.length === 0) {
    return [];
  }

  // Find users with these usernames
  const mentionedUsers = await User.find({
    username: { $in: usernames },
  }).select('_id');

  // Return an array of their IDs
  return mentionedUsers.map((user) => user._id);
};

/**
 * Parses and validates a "latitude,longitude" string.
 * @param {string} latlngStr - The string to parse, e.g., "40.7128,-74.0060".
 * @returns {number[]} A [longitude, latitude] array for GeoJSON.
 * @throws {AppError} If validation fails.
 */
export const parseLatLng = (latlngStr) => {
  if (!latlngStr) {
    throw new AppError(
      'Please provide a latlng query parameter in "lat,lng" format.',
      400
    );
  }
  const parts = latlngStr.split(',');
  if (parts.length !== 2) {
    throw new AppError('Invalid latlng format. Please use "lat,lng".', 400);
  }

  const [lat, lng] = parts.map(parseFloat);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AppError('Invalid numbers for latitude and longitude.', 400);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError('Invalid geographical coordinates.', 400);
  }

  return [lng, lat]; // GeoJSON format: [longitude, latitude]
};

/**
 * Parses and validates a distance string (in km) and converts to meters.
 * @param {string} distanceStr - The distance in kilometers.
 * @returns {number|null} The distance in meters, or null if not provided.
 * @throws {AppError} If validation fails.
 */
export const parseDistanceToMeters = (distanceStr) => {
  if (!distanceStr) return null;

  const distanceKm = parseFloat(distanceStr);

  if (!Number.isFinite(distanceKm)) {
    throw new AppError('Distance must be a valid number.', 400);
  }
  if (distanceKm <= 0) {
    throw new AppError('Distance must be a positive number.', 400);
  }

  return distanceKm * 1000; // Convert km to meters
};

/**
 * Parses and validates a limit string.
 * @param {string} limitStr - The result limit.
 * @returns {number|null} The parsed limit, or null if not provided.
 * @throws {AppError} If validation fails.
 */
export const parseLimit = (limitStr) => {
  if (!limitStr) return null;

  const limit = parseInt(limitStr, 10);

  if (!Number.isFinite(limit)) {
    throw new AppError('Limit must be a valid integer.', 400);
  }
  if (limit <= 0) {
    throw new AppError('Limit must be a positive integer.', 400);
  }

  return limit;
};

import City from '../models/cityModel.js';
import Program from '../models/programModel.js';
import SystemCache from '../models/systemCacheModel.js';
import University from '../models/universityModel.js';
import UniversityProgram from '../models/universityProgramModel.js';
import {
  parseDistanceToMeters,
  parseLatLng,
  parseLimit,
} from '../utils/helpers.js';

const cardFields =
  'name slug coverImage ratingsAverage bestKnownFor ratingsQuantity city rank.eduRank.ethiopiaRank address.city';

export const fetchFeatured = () => {
  return University.find({ isFeatured: true })
    .sort('-ratingsAverage')
    .select(cardFields);
};

export const fetchTrending = async () => {
  const trendingCache = await SystemCache.findOne({
    key: 'trendingUniversities',
  });
  const trendingIds = trendingCache ? trendingCache.value : [];

  if (trendingIds.length === 0) {
    return [];
  }

  const trendingUniversities = await University.find({
    _id: { $in: trendingIds },
  }).select(cardFields);

  const orderedTrending = trendingIds
    .map((id) => trendingUniversities.find((u) => u._id.equals(id)))
    .filter(Boolean);

  return orderedTrending;
};

export const fetchSuggestedByLocation = async (user, options = {}) => {
  const { limit = 5 } = options;

  if (!user || !user.location?.coordinates) {
    return [];
  }

  const homeCity = await City.findOne({
    location: {
      $near: {
        $geometry: user.location,
        $maxDistance: 100000,
      },
    },
  }).select('climate.elevationZone');

  if (!homeCity || !homeCity.climate?.elevationZone) {
    return [];
  }

  const targetZoneId = homeCity.climate.elevationZone;

  const pipeline = [
    {
      $lookup: {
        from: 'cities',
        localField: 'city',
        foreignField: '_id',
        as: 'cityDetails',
      },
    },
    { $unwind: '$cityDetails' },
    { $match: { 'cityDetails.climate.elevationZone': targetZoneId } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        name: 1,
        slug: 1,
        coverImage: 1,
        city: '$cityDetails.name',
        rank: '$rank.eduRank.ethiopiaRank',
        ratingsAverage: 1,
        ratingsQuantity: 1,
      },
    },
  ];

  const suggestions = await University.aggregate(pipeline);

  return suggestions;
};

export const fetchSuggestedByProgram = async (user, options = {}) => {
  const { limit = 5 } = options;

  const userInterests = user?.fieldsOfInterest;
  if (!userInterests || userInterests.length === 0) {
    return [];
  }

  const suggestions = await UniversityProgram.aggregate([
    { $match: { program: { $in: userInterests } } },
    { $group: { _id: '$university', matchCount: { $sum: 1 } } },
    { $sort: { matchCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'universities',
        localField: '_id',
        foreignField: '_id',
        as: 'university',
      },
    },
    { $unwind: '$university' },
    { $replaceRoot: { newRoot: '$university' } },
    {
      $project: {
        name: 1,
        slug: 1,
        coverImage: 1,
        city: '$address.city',
        rank: '$rank.eduRank.ethiopiaRank',
        ratingsAverage: 1,
        ratingsQuantity: 1,
      },
    },
  ]);

  return suggestions;
};

export const fetchUniversitiesByLocation = async (user, options = {}) => {
  const { latlng, maxDistance, limit: limitStr, slug } = options;
  let coordinates;

  if (latlng) {
    coordinates = parseLatLng(latlng);
  } else if (user?.location?.coordinates) {
    coordinates = user.location.coordinates;
  } else {
    return [];
  }

  const distanceInMeters = parseDistanceToMeters(maxDistance);
  const limit = parseLimit(limitStr);

  const geoNearOptions = {
    near: {
      type: 'Point',
      coordinates,
    },
    distanceField: 'distance',
    spherical: true,
  };

  if (distanceInMeters) {
    geoNearOptions.maxDistance = distanceInMeters;
  }
  if (slug) {
    geoNearOptions.query = { slug };
  }

  const pipeline = [{ $geoNear: geoNearOptions }];

  if (limit && !slug) {
    pipeline.push({ $limit: limit });
  }

  pipeline.push({
    $project: {
      name: 1,
      slug: 1,
      city: '$address.city',
      coverImage: 1,
      ratingsAverage: 1,
      ratingsQuantity: 1,
      rank: '$rank.eduRank.ethiopiaRank',
      distanceInKm: { $round: [{ $divide: ['$distance', 1000] }, 2] },
    },
  });

  const universities = await University.aggregate(pipeline);

  return universities;
};

export const fetchRarePrograms = async (options = {}) => {
  const { limit = 5 } = options;

  const pipeline = [
    { $match: { tags: 'specialized' } },
    { $limit: limit },
    {
      $lookup: {
        from: 'universityprograms',
        localField: '_id',
        foreignField: 'program',
        as: 'offerings',
      },
    },
    {
      $lookup: {
        from: 'universities',
        localField: 'offerings.university',
        foreignField: '_id',
        as: 'universities',
      },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        coverImage: 1,
        field: 1,
        duration: 1,
        universities: { $slice: ['$universities.name', 4] },
      },
    },
  ];

  const rarePrograms = await Program.aggregate(pipeline);

  return rarePrograms;
};

export const fetchTopRankedUniversities = (options = {}) => {
  const { limit = 5 } = options;
  return University.find({ 'rank.eduRank.ethiopiaRank': { $ne: null } })
    .sort('rank.eduRank.ethiopiaRank')
    .limit(limit)
    .select(cardFields);
};

export const fetchTopRatedUniversities = (options = {}) => {
  const { limit = 5 } = options;
  return University.find()
    .sort('-ratingsAverage -ratingsQuantity')
    .limit(limit)
    .select(cardFields);
};

export const fetchTopReviewedUniversities = (options = {}) => {
  const { limit = 5 } = options;
  return University.find()
    .sort('-ratingsQuantity -ratingsAverage')
    .limit(limit)
    .select(cardFields);
};

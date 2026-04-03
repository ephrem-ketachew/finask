import University, {
  UNIVERSITY_GALLERY_OPTIONS,
} from '../models/universityModel.js';
import {
  fetchFeatured,
  fetchSuggestedByLocation,
  fetchSuggestedByProgram,
  fetchTopRankedUniversities,
  fetchTopRatedUniversities,
  fetchTopReviewedUniversities,
  fetchTrending,
  fetchUniversitiesByLocation,
} from '../services/homepageService.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import {
  flattenObjectForMongoose,
  processQueryOperators,
} from '../utils/helpers.js';
import { logInteraction } from '../utils/interactionLogger.js';
import * as factory from './handlerFactory.js';

const buildMongoQuery = (queryObj) => {
  if (!queryObj || Object.keys(queryObj).length === 0) return null;

  let queryStr = JSON.stringify(queryObj).replace(
    /\b(gte|gt|lte|lt|in|nin|all)\b/g,
    (match) => `$${match}`
  );
  let processed = JSON.parse(queryStr);

  processed = processQueryOperators(processed);

  return flattenObjectForMongoose(processed);
};

export const getAllUniversities = catchAsync(async (req, res, next) => {
  const universityQuery = {};
  const cityQuery = {};
  const elevationZoneQuery = {};
  const excludedFields = ['page', 'sort', 'limit', 'fields'];

  for (const key in req.query) {
    if (excludedFields.includes(key)) continue;

    const value = req.query[key];

    if (key.startsWith('city_')) {
      const cleanKey = key.replace('city_', '');
      cityQuery[cleanKey] = value;
    } else if (key.startsWith('elevation_')) {
      const cleanKey = key.replace('elevation_', '');
      elevationZoneQuery[cleanKey] = value;
    } else {
      universityQuery[key] = value;
    }
  }

  const pipeline = [];

  pipeline.push({ $addFields: { originalUniversity: '$$ROOT' } });

  const universityMatchStage = buildMongoQuery(universityQuery);
  if (universityMatchStage) {
    pipeline.push({ $match: universityMatchStage });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'cities',
        localField: 'city',
        foreignField: '_id',
        as: 'cityDetails',
      },
    },
    { $unwind: '$cityDetails' },
    {
      $lookup: {
        from: 'elevationzones',
        localField: 'cityDetails.climate.elevationZone',
        foreignField: '_id',
        as: 'elevationZoneDetails',
      },
    },
    { $unwind: '$elevationZoneDetails' }
  );

  const cityMatchStage = buildMongoQuery(cityQuery);
  const elevationMatchStage = buildMongoQuery(elevationZoneQuery);

  const crossModelMatch = {};

  if (cityMatchStage) {
    for (const key in cityMatchStage) {
      crossModelMatch[`cityDetails.${key}`] = cityMatchStage[key];
    }
  }
  if (elevationMatchStage) {
    for (const key in elevationMatchStage) {
      crossModelMatch[`elevationZoneDetails.${key}`] = elevationMatchStage[key];
    }
  }

  if (Object.keys(crossModelMatch).length > 0) {
    pipeline.push({ $match: crossModelMatch });
  }

  pipeline.push({ $replaceRoot: { newRoot: '$originalUniversity' } });

  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 100;
  const skip = (page - 1) * limit;

  const sort = {};
  if (req.query.sort) {
    req.query.sort.split(',').forEach((opt) => {
      const trimmed = opt.trim();
      sort[trimmed.startsWith('-') ? trimmed.substring(1) : trimmed] =
        trimmed.startsWith('-') ? -1 : 1;
    });
  } else {
    sort.createdAt = -1;
  }

  const projectStage = {};
  if (req.query.fields) {
    req.query.fields.split(',').forEach((field) => {
      const trimmed = field.trim();
      if (trimmed.startsWith('-')) {
        projectStage[trimmed.substring(1)] = 0;
      } else {
        projectStage[trimmed] = 1;
      }
    });
  } else {
    projectStage['__v'] = 0;
  }

  pipeline.push({
    $facet: {
      metadata: [{ $count: 'total' }],
      data: [
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        { $project: projectStage },
      ],
    },
  });

  const results = await University.aggregate(pipeline);
  const universities = results[0].data;
  const totalUniversities = results[0].metadata[0]?.total || 0;

  res.status(200).json({
    status: 'success',
    totalResults: totalUniversities,
    results: universities.length,
    data: { universities },
  });
});

export const getUniversity = catchAsync(async (req, res, next) => {
  const popOptions = [
    {
      path: 'reviews',
      options: { limit: 5, sort: { createdAt: -1 } },
    },
    {
      path: 'questions',
      options: { limit: 5, sort: { createdAt: -1 } },
    },
    {
      path: 'campuses',
      select: 'name slug coverImage address distanceFromMainCampus',
      options: { limit: 5, sort: { name: 1 } },
    },
  ];

  let query = University.findById(req.params.id);
  if (popOptions) query = query.populate(popOptions);
  const university = await query;

  if (!university) {
    return next(new AppError('No university found with that ID', 404));
  }

  logInteraction({
    universityId: university._id,
    eventType: 'viewUniversityProfile',
    userId: req.user?._id,
  });

  res.status(200).json({
    status: 'success',
    data: {
      university,
    },
  });
});

export const createUniversity = factory.createOne(University);
export const updateUniversity = factory.updateOne(University);
export const deleteUniversity = factory.deleteOne(University);

export const getUniversityBySlug = catchAsync(async (req, res, next) => {
  const university = await University.findOne({
    slug: req.params.slug,
  }).populate({
    path: 'reviews',
    options: {
      limit: 5,
      sort: { createdAt: -1 },
    },
  });

  if (!university) {
    return next(new AppError('No university found with that slug.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: university,
    },
  });
});

export const uploadUniversityImages = factory.createGalleryUploadHandler(
  University,
  {
    galleryLimit: UNIVERSITY_GALLERY_OPTIONS.maxLength,
  }
);

export const deleteUniversityImages = factory.createImageDeleteHandler(
  University,
  ['coverImage', 'images']
);

export const getUniversitiesByLocation = catchAsync(async (req, res, next) => {
  const options = {
    latlng: req.query.latlng,
    maxDistance: req.query.maxDistance,
    limit: req.query.limit,
    slug: req.query.slug,
  };

  if (!options.latlng && !req.user?.location?.coordinates) {
    return next(
      new AppError(
        'Please provide a location via the "latlng" query parameter, or save one to your profile.',
        400
      )
    );
  }

  const universities = await fetchUniversitiesByLocation(req.user, options);

  if (options.slug && universities.length === 0) {
    return next(new AppError('No university found with that slug.', 404));
  }

  res.status(200).json({
    status: 'success',
    results: universities.length,
    data: {
      data: universities,
    },
  });
});

export const getTopRankedUniversities = catchAsync(async (req, res, next) => {
  const limit = req.params.num;
  const universities = await fetchTopRankedUniversities({ limit });

  res.status(200).json({
    status: 'success',
    results: universities.length,
    data: {
      data: universities,
    },
  });
});

export const getTopRatedUniversities = catchAsync(async (req, res, next) => {
  const limit = req.params.num;
  const universities = await fetchTopRatedUniversities({ limit });

  res.status(200).json({
    status: 'success',
    results: universities.length,
    data: {
      data: universities,
    },
  });
});

export const getTopReviewedUniversities = catchAsync(async (req, res, next) => {
  const limit = req.params.num;
  const universities = await fetchTopReviewedUniversities({ limit });

  res.status(200).json({
    status: 'success',
    results: universities.length,
    data: {
      data: universities,
    },
  });
});

export const getFeaturedUniversities = catchAsync(async (req, res, next) => {
  const featuredUniversities = await fetchFeatured();

  res.status(200).json({
    status: 'success',
    results: featuredUniversities.length,
    data: {
      universities: featuredUniversities,
    },
  });
});

export const getTrendingUniversities = catchAsync(async (req, res, next) => {
  const trendingUniversities = await fetchTrending();

  res.status(200).json({
    status: 'success',
    results: trendingUniversities.length,
    data: {
      universities: trendingUniversities,
    },
  });
});

export const getSuggestedByLocation = catchAsync(async (req, res, next) => {
  const options = {
    limit: req.query.limit,
  };

  const suggestions = await fetchSuggestedByLocation(req.user, options);

  res.status(200).json({
    status: 'success',
    results: suggestions.length,
    data: {
      docs: suggestions,
    },
  });
});

export const getSuggestedByProgram = catchAsync(async (req, res, next) => {
  const options = {
    limit: req.query.limit,
  };

  const suggestions = await fetchSuggestedByProgram(req.user, options);

  res.status(200).json({
    status: 'success',
    results: suggestions.length,
    data: {
      docs: suggestions,
    },
  });
});

import { CITY_GALLERY_OPTIONS } from '../models/cityModel.js';
import City from '../models/cityModel.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { parseLimit } from '../utils/helpers.js';
import * as factory from './handlerFactory.js';

const cityDetailPopulate = [
  {
    path: 'reviews',
    options: {
      limit: 5,
      sort: { createdAt: -1 },
    },
  },
  {
    path: 'questions',
    options: {
      limit: 5,
      sort: { createdAt: -1 },
    },
  },
  {
    path: 'universities',
    select: 'name slug coverImage ratingsAverage',
  },
  {
    path: 'climate.elevationZone',
    select: 'name slug',
  },
];

export const getAllCities = factory.getAll(City);
export const createCity = factory.createOne(City);
export const updateCity = factory.updateOne(City);
export const deleteCity = factory.deleteOne(City);

const elevationZonePopulate = {
  path: 'climate.elevationZone',
  select: 'name slug',
};

export const getCity = factory.getOne(
  City,
  {
    path: 'reviews',
    options: {
      limit: 5,
      sort: { createdAt: -1 },
    },
  },
  {
    path: 'questions',
    options: {
      limit: 5,
      sort: { createdAt: -1 },
    },
  },
  {
    path: 'universities',
    select: 'name slug coverImage ratingsAverage',
  },
  elevationZonePopulate
);

export const getCityBySlug = catchAsync(async (req, res, next) => {
  const city = await City.findOne({ slug: req.params.slug }).populate(
    cityDetailPopulate
  );

  if (!city) {
    return next(new AppError('No city found with that slug.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      city,
    },
  });
});

export const getSuggestedCities = catchAsync(async (req, res, next) => {
  const limit = parseLimit(req.query.limit) || 6;

  if (!req.user?.location?.coordinates) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { cities: [] },
    });
  }

  const homeCity = await City.findOne({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: req.user.location.coordinates,
        },
        $maxDistance: 100000,
      },
    },
  }).select('region climate.elevationZone');

  if (!homeCity) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { cities: [] },
    });
  }

  const match = { _id: { $ne: homeCity._id } };
  if (homeCity.climate?.elevationZone) {
    match['climate.elevationZone'] = homeCity.climate.elevationZone;
  } else if (homeCity.region) {
    match.region = homeCity.region;
  }

  const cities = await City.find(match)
    .select('name slug coverImage region ratingsAverage cityProfile.population')
    .sort('-ratingsAverage')
    .limit(limit);

  res.status(200).json({
    status: 'success',
    results: cities.length,
    data: { cities },
  });
});

export const uploadCityImages = factory.createGalleryUploadHandler(City, {
  galleryLimit: CITY_GALLERY_OPTIONS.maxLength,
});

export const deleteCityImages = factory.createImageDeleteHandler(City, [
  'coverImage',
  'images',
]);

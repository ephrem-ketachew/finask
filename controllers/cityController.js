import { CITY_GALLERY_OPTIONS } from '../models/cityModel.js';
import City from '../models/cityModel.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import * as factory from './handlerFactory.js';

export const getAllCities = factory.getAll(City);
export const createCity = factory.createOne(City);
export const updateCity = factory.updateOne(City);
export const deleteCity = factory.deleteOne(City);

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
  }
);

export const getCityBySlug = catchAsync(async (req, res, next) => {
  const city = await City.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    options: {
      limit: 5,
      sort: { createdAt: -1 },
    },
  });

  if (!city) {
    return next(new AppError('No city found with that slug.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: city,
    },
  });
});

export const uploadCityImages = factory.createGalleryUploadHandler(City, {
  galleryLimit: CITY_GALLERY_OPTIONS.maxLength,
});

export const deleteCityImages = factory.createImageDeleteHandler(City, [
  'coverImage',
  'images',
]);

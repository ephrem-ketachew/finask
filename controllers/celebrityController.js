import Celebrity from '../models/celebrityModel.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import * as factory from './handlerFactory.js';

// --- Factory-Based Handlers for Basic CRUD ---
export const getAllCelebrities = factory.getAll(Celebrity);
export const createCelebrity = factory.createOne(Celebrity);
export const updateCelebrity = factory.updateOne(Celebrity);
export const deleteCelebrity = factory.deleteOne(Celebrity);

// --- Get One Celebrity with Populated Virtual Fields ---
export const getCelebrity = factory.getOne(
  Celebrity,
  {
    path: 'questions', // Populate the questions for the celebrity's page
    options: {
      limit: 5,
      sort: { createdAt: -1 },
    },
  },
  {
    path: 'recommendedPrograms', // Populate the 'Be like them' programs
    select: 'name slug coverImage duration field',
  }
);

// --- Custom Handler for fetching by slug ---
export const getCelebrityBySlug = catchAsync(async (req, res, next) => {
  const celebrity = await Celebrity.findOne({ slug: req.params.slug }).populate(
    [
      {
        path: 'questions',
        options: {
          limit: 5,
          sort: { createdAt: -1 },
        },
      },
      {
        path: 'recommendedPrograms',
        select: 'name slug coverImage duration field',
      },
    ]
  );

  if (!celebrity) {
    return next(new AppError('No celebrity found with that slug.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: celebrity,
    },
  });
});

// --- Image Management Handlers using the Factory ---
export const uploadCelebrityImages =
  factory.createGalleryUploadHandler(Celebrity);

export const deleteCelebrityImages = factory.createImageDeleteHandler(
  Celebrity,
  ['profileImage', 'coverImage']
);

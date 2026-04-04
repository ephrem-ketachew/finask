import Program, { PROGRAM_GALLERY_OPTIONS } from '../models/programModel.js';
import { fetchRarePrograms } from '../services/homepageService.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import * as factory from './handlerFactory.js';

// --- Factory-Based Handlers for Basic CRUD ---
export const getAllPrograms = factory.getAll(Program);
export const createProgram = factory.createOne(Program);
export const updateProgram = factory.updateOne(Program);
export const deleteProgram = factory.deleteOne(Program);

// --- Get One Program with Populated University Offerings ---
export const getProgram = factory.getOne(
  Program,
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
  // This is the nested populate for the many-to-many relationship
  {
    path: 'universityOfferings',
    select: 'university yearOffered graduatesCount', // Select metadata from the join model
    populate: {
      path: 'university', // Populate the actual university from the join model
      select: 'name slug coverImage', // Select the fields you need for the UI
    },
  }
);

// --- Custom Handler for fetching by slug ---
export const getProgramBySlug = catchAsync(async (req, res, next) => {
  const program = await Program.findOne({ slug: req.params.slug }).populate([
    {
      path: 'reviews',
      options: {
        limit: 5,
        sort: { createdAt: -1 },
      },
    },
    {
      path: 'universityOfferings',
      select: 'university yearOffered graduatesCount',
      populate: {
        path: 'university',
        select: 'name slug coverImage city',
      },
    },
  ]);

  if (!program) {
    return next(new AppError('No program found with that slug.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      program,
    },
  });
});

// --- Image Management Handlers using the Factory ---
export const uploadProgramImages = factory.createGalleryUploadHandler(Program, {
  galleryLimit: PROGRAM_GALLERY_OPTIONS.maxLength,
});

export const deleteProgramImages = factory.createImageDeleteHandler(Program, [
  'coverImage',
  'images',
]);

export const getRarePrograms = catchAsync(async (req, res, next) => {
  const options = {
    limit: req.query.limit,
  };

  const rarePrograms = await fetchRarePrograms(options);

  res.status(200).json({
    status: 'success',
    results: rarePrograms.length,
    data: {
      docs: rarePrograms,
    },
  });
});

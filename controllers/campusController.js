import Campus, { CAMPUS_GALLERY_OPTIONS } from '../models/campusModel.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { logInteraction } from '../utils/interactionLogger.js';
import * as factory from './handlerFactory.js';

// This middleware prepares the request for the createOne factory
// It takes the universityId from the URL and adds it to the body
export const setUniversityId = (req, res, next) => {
  if (!req.body.university) req.body.university = req.params.universityId;
  next();
};

export const getAllCampuses = factory.getAll(Campus);

export const getCampus = catchAsync(async (req, res, next) => {
  const popOptions = [
    {
      path: 'university',
      select: 'name slug',
    },
    {
      path: 'reviews',
      options: { limit: 5, sort: { createdAt: -1 } },
    },
    {
      path: 'questions',
      options: { limit: 5, sort: { createdAt: -1 } },
    },
  ];

  const campus = await Campus.findById(req.params.id).populate(popOptions);

  if (!campus) {
    return next(new AppError('No campus found with that ID', 404));
  }

  logInteraction({
    universityId: campus.university._id,
    eventType: 'viewCampusDetails',
    userId: req.user?._id,
  });

  res.status(200).json({
    status: 'success',
    data: {
      campus,
    },
  });
});

export const createCampus = factory.createOne(Campus);
export const updateCampus = factory.updateOne(Campus);
export const deleteCampus = factory.deleteOne(Campus);

export const getCampusBySlug = catchAsync(async (req, res, next) => {
  const campus = await Campus.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    options: {
      limit: 5,
      sort: { createdAt: -1 },
    },
  });

  if (!campus) {
    return next(new AppError('No campus found with that slug.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      campus,
    },
  });
});

export const getProgramsForCampus = catchAsync(async (req, res, next) => {
  const campus = await Campus.findById(req.params.id).populate({
    path: 'programs',
    select: 'name slug field duration coverImage',
  });

  if (!campus) {
    return next(new AppError('No campus found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    results: campus.programs.length,
    data: {
      programs: campus.programs,
    },
  });
});

export const uploadCampusImages = factory.createGalleryUploadHandler(Campus, {
  galleryLimit: CAMPUS_GALLERY_OPTIONS.maxLength,
});

export const deleteCampusImages = factory.createImageDeleteHandler(Campus, [
  'coverImage',
  'images',
]);

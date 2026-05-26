import Review from '../models/reviewModel.js';
import * as factory from './handlerFactory.js';
import { checkOwnership, toggleLike } from './controllerUtils.js';
import APIFeatures from '../utils/apiFeatures.js';
import catchAsync from '../utils/catchAsync.js';
import { logInteraction } from '../utils/interactionLogger.js';

/**
 * Generic middleware to set parent info for nested routes.
 * It dynamically finds the parent ID from URL params (e.g., universityId, cityId)
 * and sets the user ID from the authenticated user.
 * It assumes `onModelType` is set by a middleware in the parent route file.
 */
export const setParentInfo = (req, res, next) => {
  const parentId =
    req.body.onModelId ||
    req.params.universityId ||
    req.params.cityId ||
    req.params.campusId ||
    req.params.programId ||
    req.params.celebrityId;

  req.body.onModelId = parentId;
  req.body.user = req.user.id;

  next();
};

/**
 * A handler for a user to get all of their own reviews.
 * The corresponding route should be user-centric, e.g., /api/v1/users/me/reviews
 */
export const getMyReviews = (req, res, next) => {
  req.query.user = req.user.id;
  factory.getAll(Review)(req, res, next);
};

// Generic handlers created from our utility factories
export const checkReviewOwnership = checkOwnership(Review);
export const toggleLikeReview = toggleLike(Review);

export const getAllReviews = catchAsync(async (req, res, next) => {
  // Build the filter based on the parent ID and type from the URL
  const filter = {};
  if (req.params.programId) {
    filter.onModelId = req.params.programId;
    filter.onModelType = 'Program';
  } else if (req.params.universityId) {
    filter.onModelId = req.params.universityId;
    filter.onModelType = 'University';
  } else if (req.params.campusId) {
    filter.onModelId = req.params.campusId;
    filter.onModelType = 'Campus';
  } else if (req.params.cityId) {
    filter.onModelId = req.params.cityId;
    filter.onModelType = 'City';
  } else if (req.params.celebrityId) {
    filter.onModelId = req.params.celebrityId;
    filter.onModelType = 'Celebrity';
  }

  const features = new APIFeatures(Review.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const reviews = await features.query;

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});

export const createReview = catchAsync(async (req, res, next) => {
  const newReview = await Review.create(req.body);

  if (newReview.onModelType === 'University') {
    logInteraction({
      universityId: newReview.onModelId,
      eventType: 'createReview',
      userId: newReview.user,
    });
  }

  res.status(201).json({
    status: 'success',
    data: {
      review: newReview,
    },
  });
});

// Generic CRUD handlers created from the main handler factory
export const getReview = factory.getOne(Review);
export const updateReview = factory.updateOne(Review);
export const deleteReview = factory.deleteOne(Review);

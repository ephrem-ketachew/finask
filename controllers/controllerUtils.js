import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * @description Factory to create middleware that sets foreign key and user IDs on req.body for nested routes.
 * @param {string} foreignKey - The name of the field on the model (e.g., 'university').
 * @param {string} paramName - The name of the parameter in the URL (e.g., 'universityId').
 * @returns Express middleware function.
 */
export const setDataForNestedRoute =
  (foreignKey, paramName) => (req, res, next) => {
    if (!req.body[foreignKey]) req.body[foreignKey] = req.params[paramName];
    if (!req.body.user) req.body.user = req.user.id;
    next();
  };

/**
 * @description A factory function to create a middleware that checks if a user owns a document.
 * @param {import('mongoose').Model} Model - The Mongoose model to check against (e.g., Review, Question).
 * @returns Express middleware function.
 */
export const checkOwnership = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(
        new AppError(
          `No ${Model.modelName.toLowerCase()} found with that ID`,
          404
        )
      );
    }

    // Allow access if the user is the owner or an admin
    if (doc.user.id !== req.user.id && req.user.role !== 'admin') {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  });

/**
 * @description A factory function to create a middleware that toggles a like on a document.
 * @param {import('mongoose').Model} Model - The Mongoose model to like/unlike (e.g., Review, Question).
 * @returns Express middleware function.
 */
export const toggleLike = (Model) =>
  catchAsync(async (req, res, next) => {
    const docId = req.params.id;
    const userId = req.user.id;

    const doc = await Model.findById(docId);

    if (!doc) {
      return next(
        new AppError(
          `No ${Model.modelName.toLowerCase()} found with that ID`,
          404
        )
      );
    }

    const isLiked = doc.likes.includes(userId);
    const operator = isLiked ? '$pull' : '$push';

    const updatedDoc = await Model.findByIdAndUpdate(
      docId,
      { [operator]: { likes: userId } },
      { new: true }
    );

    // Dynamically set the response key based on the model name (e.g., 'review', 'question')
    const responseKey = Model.modelName.toLowerCase();

    res.status(200).json({
      status: 'success',
      data: {
        [responseKey]: updatedDoc,
      },
    });
  });

import Favorite from '../models/favoriteModel.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { logInteraction } from '../utils/interactionLogger.js';

export const setUserIdForCreate = (req, res, next) => {
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

export const getAllFavorites = catchAsync(async (req, res, next) => {
  const filter = { user: req.user.id };

  if (req.query.item) {
    filter.item = req.query.item;
  }
  if (req.query.onModel) {
    filter.onModel = req.query.onModel;
  }

  const favorites = await Favorite.find(filter).populate('item');

  res.status(200).json({
    status: 'success',
    results: favorites.length,
    data: {
      favorites,
    },
  });
});

export const createFavorite = catchAsync(async (req, res, next) => {
  req.body.user = req.user.id;

  const newFavorite = await Favorite.create(req.body);

  if (newFavorite.onModel === 'University') {
    logInteraction({
      universityId: newFavorite.item,
      eventType: 'favoriteUniversity',
      userId: newFavorite.user,
    });
  }

  res.status(201).json({
    status: 'success',
    data: {
      favorite: newFavorite,
    },
  });
});

export const deleteFavorite = catchAsync(async (req, res, next) => {
  const favorite = await Favorite.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!favorite) {
    return next(
      new AppError('No favorite found with that ID for the current user.', 404)
    );
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

import catchAsync from '../utils/catchAsync.js';
import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import sharp from 'sharp';
import * as factory from './handlerFactory.js';
import { filterObj } from '../utils/helpers.js';

export const createUser = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(
    req.body,
    'firstName',
    'lastName',
    'username',
    'email',
    'password',
    'passwordConfirm',
    'role',
    'status'
  );

  const user = await User.create(filteredBody);
  user.password = undefined;

  res.status(201).json({
    status: 'success',
    data: {
      user,
    },
  });
});

export const getUser = factory.getOne(User, {
  path: 'fieldsOfInterest',
  select: 'name',
});

export const getAllUsers = factory.getAll(User);

export const deleteUser = factory.deleteOne(User);

export const updateUser = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(
    req.body,
    'firstName',
    'lastName',
    'email',
    'role',
    'status'
  );

  const user = await User.findByIdAndUpdate(req.params.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new AppError('No user found with the provided ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

export const getMe = catchAsync(async (req, res, next) => {
  req.params.id = req.user.id;
  next();
});

export const updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updatePassword.',
        400
      )
    );
  }

  const filteredBody = filterObj(
    req.body,
    'firstName',
    'lastName',
    'username',
    'fieldsOfInterest',
    'headline',
    'location',
    'birthday',
    'bio',
    'status',
    'phoneNumber',
    'telegramUsername',
    'linkedInUsername',
    'gender',
    'pronoun',
    'languages',
    'interests',
    'funFact',
    'visibilitySettings'
  );

  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  Object.assign(user, filteredBody);

  const updatedUser = await user.save({ validateBeforeSave: true });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

export const updateUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file || !req.file.cloudinaryResult) {
    return next(new AppError('No image uploaded.', 400));
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  user.profileImage = req.file.cloudinaryResult.secure_url;
  await user.save();

  res.status(200).json({ status: 'success', data: { user } });
});

export const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user.id,
    { active: false },
    { new: true, runValidators: false }
  );

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

export const getUserProfile = catchAsync(async (req, res, next) => {
  const requestingUser = req.user;
  const profileUser = await User.findById(req.params.id);

  if (!profileUser) {
    return next(new AppError('No user found with that ID.', 404));
  }

  if (requestingUser.id === profileUser._id.toString()) {
    const fullUserDoc = await User.findById(requestingUser.id);
    return res.status(200).json({
      status: 'success',
      data: {
        user: fullUserDoc,
      },
    });
  }

  const publicProfile = {
    id: profileUser._id,
    firstName: profileUser.firstName,
    lastName: profileUser.lastName,
    username: profileUser.username,
    headline: profileUser.headline,
    location: profileUser.location,
    createdAt: profileUser.createdAt,
    profileCompletion: profileUser.profileCompletion,
  };

  const fieldsToProcess = Object.keys(profileUser.visibilitySettings);

  for (const field of fieldsToProcess) {
    const visibility = profileUser.visibilitySettings[field];

    if (visibility === 'public') {
      publicProfile[field] = profileUser[field];
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: publicProfile,
    },
  });
});

import catchAsync from '../utils/catchAsync.js';
import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import sharp from 'sharp';
import * as factory from './handlerFactory.js';
import { filterObj } from '../utils/helpers.js';
import University from '../models/universityModel.js';
import mongoose from 'mongoose';
const UNIQUE_MANAGER_PER_UNIVERSITY =
  process.env.UNIQUE_MANAGER_PER_UNIVERSITY === 'true';

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
    'status',
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
    'status',
    'managedUniversity',
  );

  const user = await User.findById(req.params.id);
  if (!user)
    return next(new AppError('No user found with the provided ID.', 404));

  // If managedUniversity is provided, validate it
  if (filteredBody.managedUniversity) {
    if (!mongoose.Types.ObjectId.isValid(filteredBody.managedUniversity)) {
      return next(new AppError('Invalid university id provided.', 400));
    }

    const uni = await University.findById(filteredBody.managedUniversity);
    if (!uni)
      return next(new AppError('No university found with that ID.', 404));

    // Optionally ensure no other manager currently owns this university
    if (UNIQUE_MANAGER_PER_UNIVERSITY) {
      const existing = await User.findOne({
        managedUniversity: filteredBody.managedUniversity,
        role: 'university_manager',
        _id: { $ne: req.params.id },
      }).select('+active');

      if (existing) {
        return next(
          new AppError(
            'Another university manager is already assigned to that university.',
            409,
          ),
        );
      }
    }
  }

  // If role is being changed away from university_manager, clear managedUniversity
  if (filteredBody.role && filteredBody.role !== 'university_manager') {
    user.managedUniversity = undefined;
  }

  // Assign allowed fields and save
  Object.assign(user, filteredBody);
  const updatedUser = await user.save({ validateBeforeSave: true });

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

export const getMyManagedUniversity = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('managedUniversity');
  if (!user) return next(new AppError('User not found.', 404));

  res
    .status(200)
    .json({
      status: 'success',
      data: { managedUniversity: user.managedUniversity },
    });
});

export const updateMyManagedUniversity = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found.', 404));

  // Only allow managers to set their managed university
  if (user.role !== 'university_manager') {
    return next(
      new AppError(
        'Only university managers can assign a managed university to their account.',
        403,
      ),
    );
  }

  const { managedUniversity } = req.body;
  if (!managedUniversity)
    return next(
      new AppError('managedUniversity is required in the body.', 400),
    );

  if (!mongoose.Types.ObjectId.isValid(managedUniversity)) {
    return next(new AppError('Invalid university id provided.', 400));
  }

  const uni = await University.findById(managedUniversity);
  if (!uni) return next(new AppError('No university found with that ID.', 404));

  if (UNIQUE_MANAGER_PER_UNIVERSITY) {
    const existing = await User.findOne({
      managedUniversity,
      role: 'university_manager',
      _id: { $ne: user._id },
    }).select('+active');

    if (existing)
      return next(
        new AppError('Another manager already owns that university.', 409),
      );
  }

  user.managedUniversity = uni._id;
  await user.save({ validateBeforeSave: true });

  res.status(200).json({ status: 'success', data: { managedUniversity: uni } });
});

export const adminAssignUniversity = catchAsync(async (req, res, next) => {
  const { id } = req.params; // user id
  const { managedUniversity } = req.body;

  const user = await User.findById(id);
  if (!user) return next(new AppError('User not found.', 404));

  if (managedUniversity) {
    if (!mongoose.Types.ObjectId.isValid(managedUniversity)) {
      return next(new AppError('Invalid university id provided.', 400));
    }

    const uni = await University.findById(managedUniversity);
    if (!uni)
      return next(new AppError('No university found with that ID.', 404));

    if (UNIQUE_MANAGER_PER_UNIVERSITY) {
      const existing = await User.findOne({
        managedUniversity,
        role: 'university_manager',
        _id: { $ne: user._id },
      }).select('+active');

      if (existing)
        return next(
          new AppError('Another manager already owns that university.', 409),
        );
    }

    user.managedUniversity = uni._id;
    // If role isn't already manager, promote them (admin intends to assign)
    if (user.role !== 'university_manager') user.role = 'university_manager';
  } else {
    // Clearing managedUniversity
    user.managedUniversity = undefined;
  }

  await user.save({ validateBeforeSave: true });

  res.status(200).json({ status: 'success', data: { user } });
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
        400,
      ),
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
    'visibilitySettings',
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
    { new: true, runValidators: false },
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

import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import sendEmail from '../utils/email.js';
import crypto from 'crypto';
import catchAsync from '../utils/catchAsync.js';
import User from '../models/userModel.js';
import AppError from '../utils/appError.js';
import TokenBlocklist from '../models/tokenBlocklistModel.js';
import { OAuth2Client } from 'google-auth-library';

const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const signup = catchAsync(async (req, res, next) => {
  const existingUser = await User.findOne({ email: req.body.email })
    .select('+active')
    .setOptions({ includeInactive: true });

  if (existingUser && existingUser.isDeactivated()) {
    return next(
      new AppError(
        'This email is associated with a deactivated account. Please contact support or try a different one.',
        400
      )
    );
  }

  const filteredBody = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    fieldsOfInterest: req.body.fieldsOfInterest,
  };

  const newUser = await User.create(filteredBody);

  const verificationToken = newUser.createVerificationToken();
  await newUser.save({ validateBeforeSave: false });

  const message = `Welcome! Your email verification code is: ${verificationToken}\nThis code is valid for 24 hours.`;

  try {
    await sendEmail({
      email: newUser.email,
      subject: 'Verify Your Email Address',
      message: `Welcome! Your email verification code is: ${verificationToken}\nThis code is valid for 24 hours.`,
      template: 'accountVerification',
      name: newUser.firstName || 'there',
      verificationCode: verificationToken,
    });

    res.status(201).json({
      status: 'success',
      message:
        'Account created. Please check your email to verify your account.',
    });
  } catch (err) {
    await User.findByIdAndDelete(newUser._id);
    return next(
      new AppError(
        'There was an error sending the email. Please try again later.'
      ),
      500
    );
  }
});

export const verifyEmail = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return next(new AppError('Please provide both email and code.', 400));
  }

  const user = await User.findOne({ email });

  const hashedToken = crypto.createHash('sha256').update(code).digest('hex');

  if (
    !user ||
    user.verificationToken !== hashedToken ||
    user.verificationTokenExpires < Date.now()
  ) {
    return next(new AppError('Code is invalid or has expired.', 400));
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
});

export const resendVerificationEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Please provide an email address.', 400));
  }

  const user = await User.findOne({ email });

  if (user && !user.isVerified) {
    try {
      const verificationToken = user.createVerificationToken();
      await user.save({ validateBeforeSave: false });

      await sendEmail({
        email: user.email,
        subject: 'Resend: Verify Your Email Address',
        message: `We've received a request to resend your email verification. Your new code is: ${verificationToken}`,
        template: 'accountVerification',
        name: user.firstName || 'there',
        verificationCode: verificationToken,
      });
    } catch (err) {
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(
        new AppError(
          'We could not send the verification email. Please try again later.',
          500
        )
      );
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'A new verification link has been sent to your email.',
  });
});

export const login = catchAsync(async (req, res, next) => {
  const { email, username, password } = req.body;

  const queryConditions = [];
  if (email) queryConditions.push({ email });
  if (username && username.trim() !== '') {
    queryConditions.push({ username });
  }

  if (queryConditions.length === 0) {
    return next(new AppError('Please provide your email or username.', 400));
  }

  if (!password)
    return next(new AppError('Please provide your password.', 400));

  const user = await User.findOne({ $or: queryConditions })
    .select('+active')
    .setOptions({ includeInactive: true })
    .select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Invalid credentials', 401));
  }

  if (!user.isVerified) {
    return next(
      new AppError(
        'Your account is not verified. Please check your email or request a new verification link.',
        401
      )
    );
  }

  if (user.isDeactivated()) {
    return next(
      new AppError('Your account is deactivated. Contact support.', 401)
    );
  }

  const token = signToken(user._id);
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
});

export const googleSignIn = catchAsync(async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(new AppError('Google ID token is missing.', 400));
  }

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    return next(new AppError('Invalid or expired Google token.', 401));
  }

  const payload = ticket.getPayload();

  const googleId = payload.sub;
  const email = payload.email;
  const firstName = payload.given_name;
  const lastName = payload.family_name;
  const profileImage = payload.picture;

  let user = await User.findOne({ googleId });

  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      user.googleId = googleId;
      if (user.profileImage === 'default.jpg' && profileImage) {
        user.profileImage = profileImage;
      }
    } else {
      user = await User.create({
        googleId,
        email,
        firstName,
        lastName,
        profileImage,
        isVerified: true,
      });
    }
  }

  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
});

export const protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in... please log in to access.', 401)
    );
  }

  const blocklistedToken = await TokenBlocklist.findOne({ token });
  if (blocklistedToken) {
    return next(
      new AppError('You have been logged out. Please log in again.', 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  if (decoded.purpose) {
    return next(new AppError('This token is not valid for this route.', 403));
  }

  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  if (freshUser.isDeactivated()) {
    return next(
      new AppError('This account is deactivated. Please contact support.', 401)
    );
  }

  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Please log in again.', 401)
    );
  }

  req.user = freshUser;
  next();
});

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You don not have permission to perfrom this action.', 403)
      );
    }

    next();
  };
};

export const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(200).json({
      status: 'success',
      message: 'If a user with that email exists, a reset code has been sent.',
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your Password Reset Code (Valid for 10 mins)',
      message: `Your password reset code is: ${resetToken}. This code is valid for 10 minutes.`,
      template: 'passwordReset',
      name: user.firstName.split(' ')[0],
      resetCode: resetToken,
    });

    res.status(200).json({
      status: 'success',
      message: 'A reset code has been sent to your email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Please try again later.',
        500
      )
    );
  }
});

export const verifyResetCode = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return next(new AppError('Please provide both email and code.', 400));
  }

  const hashedToken = crypto.createHash('sha256').update(code).digest('hex');

  const user = await User.findOne({
    email,
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Code is invalid or has expired.', 400));
  }

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateBeforeSave: false });

  const resetAuthToken = jwt.sign(
    { id: user._id, purpose: 'password-reset' },
    process.env.JWT_SECRET,
    {
      expiresIn: '10m',
    }
  );

  res.status(200).json({
    status: 'success',
    message: 'Code verified successfully. You may now reset your password.',
    resetAuthToken,
  });
});

export const authorizePasswordReset = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication token missing.', 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  if (decoded.purpose !== 'password-reset') {
    return next(
      new AppError('This token is not valid for resetting a password.', 403)
    );
  }

  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  req.user = freshUser;
  next();
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  if (!user.isVerified) {
    user.isVerified = true;
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  const token = signToken(user._id);
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
});

export const updatePassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword, newPasswordConfirm } = req.body;

  if (!oldPassword || !newPassword || !newPasswordConfirm) {
    return next(
      new AppError(
        'Please provide old password, new password, and confirmation.',
        400
      )
    );
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.correctPassword(oldPassword, user.password))) {
    return next(new AppError('Your current password is incorrect.', 401));
  }

  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;

  await user.save();

  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
});

export const signout = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];

  await TokenBlocklist.create({ token });

  res.status(200).json({
    status: 'success',
    message: 'You have been successfully signed out.',
  });
});

export const protectOptional = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  const blocklistedToken = await TokenBlocklist.findOne({ token });
  if (blocklistedToken) {
    return next();
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  if (decoded.purpose) {
    return next();
  }

  const freshUser = await User.findById(decoded.id);
  if (
    !freshUser ||
    freshUser.isDeactivated() ||
    freshUser.changedPasswordAfter(decoded.iat)
  ) {
    return next();
  }

  req.user = freshUser;
  next();
});

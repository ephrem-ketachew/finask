import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import {
  createCloudImageUrlField,
  createGeoLocationField,
  createNameField,
  emailField,
  flexiblePhoneField,
  optionalStringField,
} from '../utils/schemaHelpers.js';
import Interest from './interestModel.js';

// --- REGEX DEFINITIONS ---

const usernameRegex = /^[A-Za-z0-9_]+$/;
const telegramUsernameRegex = /^[a-zA-Z0-9_]{5,32}$/;
const linkedInUsernameRegex = /^[a-zA-Z0-9-]{3,100}$/;
const DEFAULT_PROFILE_IMAGE =
  'https://res.cloudinary.com/dxhkryxzk/image/upload/v1755980278/avatar2_bkwawy.png';

const visibilityOptions = ['public', 'private', 'connections'];

const COMPLETION_FIELDS = [
  'profileImage',
  'headline',
  'username',
  'birthday',
  'bio',
  'status',
  'address',
  'location',
  'phoneNumber',
  'gender',
  'pronoun',
  'telegramUsername',
  'linkedInUsername',
  'funFact',
  'languages',
  'interests',
];

const createVisibilityField = (defaultValue = 'private') => ({
  type: String,
  enum: visibilityOptions,
  default: defaultValue,
});

const userSchema = new mongoose.Schema(
  {
    // --- CORE PROFILE ---
    firstName: createNameField('First name', { minLength: 2, maxLength: 30 }),
    lastName: createNameField('Last name', { minLength: 2, maxLength: 30 }),

    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      minlength: [4, 'Username must be at least 4 characters'],
      validate: {
        validator: (val) => usernameRegex.test(val),
        message: 'Username can only contain letters, numbers, and underscores',
      },
    },

    headline: optionalStringField,
    address: optionalStringField,
    profileImage: {
      ...createCloudImageUrlField('Profile image'),
      default: DEFAULT_PROFILE_IMAGE,
    },

    birthday: {
      type: Date,
      validate: {
        validator: function (date) {
          const today = new Date();
          const birthDate = new Date(date);
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age >= 13;
        },
        message: 'You must be at least 13 years old to register.',
      },
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: [
        'high-school-student',
        'university-student',
        'recent-graduate',
        'working-professional',
        'lecturer',
        'teacher',
        'entrepreneur',
        'freelancer',
        'seeking-opportunities',
        'parent',
        'taking-a-gap-year',
        'other',
      ],
      default: 'university-student',
    },
    // --- CONTACT & AUTH ---
    email: {
      ...emailField,
      required: [true, 'Email is required'],
      unique: true,
    },

    phoneNumber: flexiblePhoneField,
    password: {
      type: String,
      required: [
        function () {
          return !this.googleId;
        },
        'Password is required for email and password sign-ups.',
      ],
      validate: {
        validator: function (value) {
          return value && value.length >= 6;
        },
        message: 'Password must be at least 6 characters long.',
      },
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [
        function () {
          // Required only if password is being created/modified AND not a Google user.
          return (this.isNew || this.isModified('password')) && !this.googleId;
        },
        'Please confirm your password',
      ],
      validate: {
        // This only works on CREATE and SAVE!
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords do not match',
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple users to have a null value (for non-Google users)
    },

    // --- ACADEMIC ---
    fieldsOfInterest: {
      type: [
        {
          type: mongoose.Schema.ObjectId,
          ref: 'Program',
        },
      ],
      validate: {
        validator: function (arr) {
          const list = arr ?? [];
          // Google users can sign in first and complete fields in-app.
          if (this.googleId && list.length === 0) return true;
          return list.length > 0;
        },
        message: 'You must select at least one field of interest.',
      },
    },

    // --- SOCIAL & PERSONAL ---
    telegramUsername: {
      type: String,
      validate: {
        validator: (val) => !val || telegramUsernameRegex.test(val),
        message: 'Invalid Telegram username',
      },
    },
    linkedInUsername: {
      type: String,
      validate: {
        validator: (val) => !val || linkedInUsernameRegex.test(val),
        message: 'Invalid LinkedIn username',
      },
    },
    gender: {
      type: String,
      trim: true,
      enum: ['male', 'female', 'prefer not to say'],
    },
    pronoun: {
      type: String,
      trim: true,
      enum: ['he/him', 'she/her', 'they/them', 'prefer not to say', 'other'],
    },
    languages: {
      type: [String],
    },
    interests: {
      type: [String],
      default: [],
      validate: {
        validator: async function (interestsArray) {
          if (interestsArray.length === 0) return true;

          const lowercasedInterests = interestsArray.map((name) =>
            name.toLowerCase(),
          );

          const count = await Interest.countDocuments({
            name: { $in: lowercasedInterests },
          });
          return count === interestsArray.length;
        },
        message: 'One or more of the selected interests are not valid.',
      },
    },
    funFact: {
      type: String,
      maxlength: 100,
    },

    visibilitySettings: {
      address: createVisibilityField('public'),
      profileImage: createVisibilityField('public'),
      birthday: createVisibilityField('private'),
      bio: createVisibilityField('public'),
      status: createVisibilityField('public'),
      phoneNumber: createVisibilityField('private'),
      telegramUsername: createVisibilityField('private'),
      linkedInUsername: createVisibilityField('private'),
      gender: createVisibilityField('private'),
      pronoun: createVisibilityField('private'),
      languages: createVisibilityField('public'),
      interests: createVisibilityField('public'),
      hobbies: createVisibilityField('public'),
      funFact: createVisibilityField('public'),
    },

    // --- ROLE & STATUS ---
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin', 'university_manager'],
      default: 'user',
    },
    // Reference to the university this user manages (if any)
    managedUniversity: {
      type: mongoose.Schema.ObjectId,
      ref: 'University',
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },

    location: createGeoLocationField({ isRequired: false }),
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('profileCompletion').get(function () {
  let completedFields = 0;

  for (const field of COMPLETION_FIELDS) {
    const value = this[field];

    if (value) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          completedFields++;
        }
      } else if (field === 'profileImage') {
        if (value !== DEFAULT_PROFILE_IMAGE) {
          completedFields++;
        }
      } else {
        completedFields++;
      }
    }
  }

  const totalFields = COMPLETION_FIELDS.length;
  return Math.floor((completedFields / totalFields) * 100);
});

userSchema.virtual('favorites', {
  ref: 'Favorite',
  foreignField: 'user',
  localField: '_id',
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre('save', function (next) {
  if (this.isModified('interests')) {
    this.interests = this.interests.map((interest) => interest.toLowerCase());
  }
  next();
});

userSchema.pre(/^find/, function (next) {
  if (this.getOptions().includeInactive === true) {
    return next();
  }

  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.isDeactivated = function () {
  return this.active === false;
};

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.createVerificationToken = function () {
  const token = Math.floor(100000 + Math.random() * 900000).toString();

  this.verificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

  return token;
};

const User = mongoose.model('User', userSchema);
export default User;

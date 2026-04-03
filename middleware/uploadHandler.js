import multer from 'multer';
import { createCloudinaryUploader } from './cloudinaryUploader.js';
import AppError from '../utils/appError.js';

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const imageFields = [
  { name: 'coverImage', maxCount: 1 },
  { name: 'imageGallery', maxCount: 10 },
];

export const createSingleUpload = (fieldName, cloudinaryFolder) => [
  upload.single(fieldName),
  createCloudinaryUploader({ folder: cloudinaryFolder }),
];

export const createFieldsUpload = (cloudinaryFolder) => [
  upload.fields(imageFields),
  createCloudinaryUploader({ folder: cloudinaryFolder }),
];

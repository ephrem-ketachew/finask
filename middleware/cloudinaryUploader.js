import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import sharp from 'sharp';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

const streamUpload = (fileBuffer, options) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          const errorMessage = `Cloudinary upload failed. ${error.message}`;
          return reject(new AppError(errorMessage, 500));
        }
        resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });

async function validateImage(fileBuffer) {
  const metadata = await sharp(fileBuffer).metadata();

  if (metadata.width > 8000 || metadata.height > 8000) {
    throw new AppError(
      'Image dimensions too large (max 8000x8000 pixels).',
      400
    );
  }

  return metadata;
}

export const createCloudinaryUploader = (options = {}) =>
  catchAsync(async (req, res, next) => {
    if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
      return next();
    }

    if (req.file) {
      req.files = { [req.file.fieldname]: [req.file] };
    }

    const uploadOptions = { folder: 'uploads', ...options };

    const uploadPromises = [];
    const successfulUploadPublicIds = [];

    for (const field in req.files) {
      for (const file of req.files[field]) {
        try {
          // 1. Validate the image dimensions first
          await validateImage(file.buffer);

          // 2. Process the image buffer with sharp
          const processedBuffer = await sharp(file.buffer)
            .resize({ width: 1920, withoutEnlargement: true })
            .toFormat('webp', { quality: 85 })
            .toBuffer();

          // 3. Upload the PROCESSED buffer to Cloudinary
          const uploadPromise = streamUpload(
            processedBuffer,
            uploadOptions
          ).then((result) => {
            file.cloudinaryResult = result;
            successfulUploadPublicIds.push(result.public_id);
          });
          uploadPromises.push(uploadPromise);
        } catch (error) {
          // Pass the error to the Express error handler
          return next(error);
        }
      }
    }
    try {
      await Promise.all(uploadPromises);
      next();
    } catch (error) {
      console.error('Cloudinary upload failed. Initiating cleanup...');

      if (successfulUploadPublicIds.length > 0) {
        // console.log(
        //   `Deleting ${successfulUploadPublicIds.length} uploaded assets...`
        // );
        await cloudinary.api.delete_resources(successfulUploadPublicIds);
      }

      next(error);
    }
  });

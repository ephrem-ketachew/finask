import { v2 as cloudinary } from 'cloudinary';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import APIFeatures from '../utils/apiFeatures.js';
import { getPublicIdFromUrl } from '../utils/cloudinaryHelper.js';

export const deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

export const updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        [Model.modelName.toLowerCase()]: doc,
      },
    });
  });

export const createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        [Model.modelName.toLowerCase()]: doc,
      },
    });
  });

export const getOne = (Model, ...popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        [Model.modelName.toLowerCase()]: doc,
      },
    });
  });

export const getAll = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let filter = {};
    if (req.params.universityId)
      filter = { university: req.params.universityId };
    if (req.params.programId) filter = { program: req.params.programId };
    if (req.params.userId) filter = { user: req.params.userId };
    if (req.params.questionId) filter = { question: req.params.questionId };

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    let query = features.query;
    if (popOptions) {
      query = query.populate(popOptions);
    }
    const docs = await query;

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        [`${Model.modelName.toLowerCase()}s`]: docs,
      },
    });
  });

/**
 * Creates a handler for updating a cover image and image gallery.
 * Assumes the model has 'coverImage' and 'images' fields.
 * @param {mongoose.Model} Model - The Mongoose model to update.
 * @param {object} [options] - Configuration options.
 * @param {number} [options.galleryLimit=20] - The maximum number of images allowed in the gallery.
 * @returns {Function} An Express middleware function.
 */
export const createGalleryUploadHandler = (Model, { galleryLimit = 20 } = {}) =>
  catchAsync(async (req, res, next) => {
    // 1. Find the document to update
    const { id } = req.params;

    if (!req.files || (!req.files.coverImage && !req.files.imageGallery)) {
      return next(new AppError('You must upload at least one image.', 400));
    }

    const doc = await Model.findById(id);
    if (!doc) {
      return next(new AppError(`No document found with that ID`, 404));
    }

    // 2. Process the cover image
    if (req.files.coverImage) {
      const result = req.files.coverImage[0]?.cloudinaryResult;
      if (result) {
        doc.coverImage = result.secure_url;
      }
    }

    // 3. Process the image gallery
    if (req.files.imageGallery) {
      const newImageUrls = req.files.imageGallery
        .map((file) => file?.cloudinaryResult?.secure_url)
        .filter(Boolean);

      const existingImages = doc.images || [];
      const allImageUrls = [...existingImages, ...newImageUrls];
      const uniqueImageUrls = [...new Set(allImageUrls)];

      if (uniqueImageUrls.length > galleryLimit) {
        return next(
          new AppError(`Gallery cannot exceed ${galleryLimit} images.`, 400)
        );
      }

      if (uniqueImageUrls.length > galleryLimit) {
        return next(
          new AppError(
            `Cannot add images. Gallery limit is ${galleryLimit}, but this action would result in ${uniqueImageUrls.length}.`,
            400
          )
        );
      }
      doc.images = uniqueImageUrls;
    }

    // 4. Save the document and send the response
    await doc.save();

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

/**
 * Creates a handler for deleting images from Cloudinary and a Mongoose document.
 * @param {mongoose.Model} Model - The Mongoose model to update.
 * @param {Array<string>} imageFields - An array of field names that store image URLs.
 * @returns {Function} An Express middleware function.
 */
export const createImageDeleteHandler = (Model, imageFields = []) =>
  catchAsync(async (req, res, next) => {
    // 1. Get inputs and validate
    const { id } = req.params;
    const { imagesToDelete } = req.body;

    if (
      !imagesToDelete ||
      !Array.isArray(imagesToDelete) ||
      imagesToDelete.length === 0
    ) {
      return next(
        new AppError('Please provide an array of image URLs to delete.', 400)
      );
    }

    // 2. Find the document
    const doc = await Model.findById(id);
    if (!doc) {
      return next(new AppError(`No document found with that ID`, 404));
    }

    // 3. Delete resources from Cloudinary
    const publicIdsToDelete = imagesToDelete
      .map(getPublicIdFromUrl)
      .filter(Boolean);

    if (publicIdsToDelete.length > 0) {
      await cloudinary.api.delete_resources(publicIdsToDelete);
    }

    // 4. Update the document by removing the specified URLs
    for (const field of imageFields) {
      if (!doc[field]) continue; // Skip if the field is empty

      // If the field is an array (like a gallery), filter it
      if (Array.isArray(doc[field])) {
        doc[field] = doc[field].filter((url) => !imagesToDelete.includes(url));
      }
      // If the field is a single string (like a cover image), clear it
      else if (
        typeof doc[field] === 'string' &&
        imagesToDelete.includes(doc[field])
      ) {
        doc[field] = undefined; // Or null, depending on your schema
      }
    }

    await doc.save();

    // 5. Send the response
    res.status(200).json({
      status: 'success',
      message: 'Images deleted successfully.',
      data: {
        data: doc,
      },
    });
  });

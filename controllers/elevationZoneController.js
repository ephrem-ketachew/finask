import { ELEVATION_GALLERY_OPTIONS } from '../models/elevationZoneModel.js';
import ElevationZone from '../models/elevationZoneModel.js';
import City from '../models/cityModel.js';
import University from '../models/universityModel.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import * as factory from './handlerFactory.js';

// --- Factory-Based Handlers for Basic CRUD ---
export const getAllElevationZones = factory.getAll(ElevationZone);
export const createElevationZone = factory.createOne(ElevationZone);
export const updateElevationZone = factory.updateOne(ElevationZone);
export const deleteElevationZone = factory.deleteOne(ElevationZone);

// --- Get One Zone (simple version, populates only cities) ---
export const getElevationZone = factory.getOne(ElevationZone, {
  path: 'cities',
  select: 'name slug region',
});

// --- Custom Handler to Get Zone by Slug with Universities ---
// This is your custom logic, renamed for consistency and with a small query fix.
export const getElevationZoneBySlug = catchAsync(async (req, res, next) => {
  // 1. Find the Elevation Zone itself by its slug
  const elevationZone = await ElevationZone.findOne({ slug: req.params.slug });

  if (!elevationZone) {
    return next(new AppError('No elevation zone found with that slug.', 404));
  }

  // 2. Find all cities that belong to this zone using the correct nested path
  const citiesInZone = await City.find({
    'climate.elevationZone': elevationZone._id,
  }).select('_id');
  const cityIds = citiesInZone.map((city) => city._id);

  // 3. Find all universities that are in those cities
  const universities = await University.find({ city: { $in: cityIds } }).select(
    'name slug coverImage geographyAndClimate geographyAndClimate'
  );

  res.status(200).json({
    status: 'success',
    data: {
      zone: elevationZone,
      universities,
    },
  });
});

// --- Image Management Handlers using the Factory ---
export const uploadElevationZoneImages = factory.createGalleryUploadHandler(
  ElevationZone,
  {
    galleryLimit: ELEVATION_GALLERY_OPTIONS.maxLength,
  }
);

export const deleteElevationZoneImages = factory.createImageDeleteHandler(
  ElevationZone,
  ['coverImage', 'images']
);

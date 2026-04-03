import express from 'express';
import {
  createElevationZone,
  deleteElevationZone,
  deleteElevationZoneImages,
  getAllElevationZones,
  getElevationZone,
  getElevationZoneBySlug,
  updateElevationZone,
  uploadElevationZoneImages,
} from '../controllers/elevationZoneController.js';
import { protect, restrictTo } from '../controllers/authController.js';
import { createFieldsUpload } from '../middleware/uploadHandler.js';

const router = express.Router();

// --- Image Gallery Routes ---
router.patch(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator'),
  ...createFieldsUpload('elevation-zone-images'),
  uploadElevationZoneImages
);

router.delete(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator'),
  deleteElevationZoneImages
);

// --- Main CRUD Routes ---
router
  .route('/')
  .get(getAllElevationZones)
  .post(protect, restrictTo('admin'), createElevationZone);

// --- Slug and ID Specific Routes ---
// This route gets the zone AND the universities within it
router.route('/slug/:slug').get(getElevationZoneBySlug);

// This route gets the zone AND the cities within it
router
  .route('/:id')
  .get(getElevationZone)
  .patch(protect, restrictTo('admin', 'moderator'), updateElevationZone)
  .delete(protect, restrictTo('admin'), deleteElevationZone);

export default router;

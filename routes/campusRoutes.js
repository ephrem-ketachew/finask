import express from 'express';
import {
  createCampus,
  deleteCampus,
  deleteCampusImages,
  getAllCampuses,
  getCampus,
  getCampusBySlug,
  getProgramsForCampus,
  setUniversityId,
  updateCampus,
  uploadCampusImages,
} from '../controllers/campusController.js';
import { protect, restrictTo } from '../controllers/authController.js';
import reviewRouter from './reviewRoutes.js';
import questionRouter from './questionRoutes.js';
import { createFieldsUpload } from '../middleware/uploadHandler.js';

const router = express.Router({ mergeParams: true });

router.patch(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator'),
  ...createFieldsUpload('campus-images'),
  uploadCampusImages
);

router.delete(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator'),
  deleteCampusImages
);

router
  .route('/')
  .get(getAllCampuses)
  .post(protect, restrictTo('admin'), setUniversityId, createCampus);

// --- Nested Routes for Reviews & Questions ---
// This allows for routes like: /api/v1/campuses/:campusId/reviews
const setTypeToCampus = (req, res, next) => {
  req.body.onModelType = 'Campus';
  next();
};

router.route('/:id/programs').get(getProgramsForCampus);
router.use('/:campusId/reviews', setTypeToCampus, reviewRouter);
router.use('/:campusId/questions', setTypeToCampus, questionRouter);

// --- Slug and ID Specific Routes ---
router.route('/slug/:slug').get(getCampusBySlug);

router
  .route('/:id')
  .get(getCampus)
  .patch(protect, restrictTo('admin', 'moderator'), updateCampus)
  .delete(protect, restrictTo('admin'), deleteCampus);

export default router;

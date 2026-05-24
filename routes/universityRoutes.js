import express from 'express';
import {
  createUniversity,
  deleteUniversity,
  deleteUniversityImages,
  getAllUniversities,
  getFeaturedUniversities,
  getSuggestedByLocation,
  getSuggestedByProgram,
  getTopRankedUniversities,
  getTopRatedUniversities,
  getTopReviewedUniversities,
  getTrendingUniversities,
  getUniversitiesByLocation,
  getUniversity,
  getUniversityBySlug,
  updateUniversity,
  uploadUniversityImages,
} from '../controllers/universityController.js';
import { ensureManagedUniversityMatch } from '../middleware/ownershipMiddleware.js';
import * as universityProgramController from '../controllers/universityProgramController.js';
import { protect, restrictTo } from '../controllers/authController.js';
import campusRouter from './campusRoutes.js';
import reviewRouter from './reviewRoutes.js';
import questionRouter from './questionRoutes.js';
import { createFieldsUpload } from '../middleware/uploadHandler.js';

const router = express.Router();

router.patch(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator', 'university_manager'),
  ensureManagedUniversityMatch('id'),
  ...createFieldsUpload('university-images'),
  uploadUniversityImages,
);

router.delete(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator', 'university_manager'),
  ensureManagedUniversityMatch('id'),
  deleteUniversityImages,
);

router.route('/near').get(protect, getUniversitiesByLocation);

router.route('/top-:num-rated').get(getTopRatedUniversities);
router.route('/top-:num-reviewed').get(getTopReviewedUniversities);
router.route('/top-:num-ranked').get(getTopRankedUniversities);
router.route('/featured').get(getFeaturedUniversities);
router.route('/trending').get(getTrendingUniversities);
router.route('/suggested-by-location').get(protect, getSuggestedByLocation);
router.route('/suggested-by-program').get(protect, getSuggestedByProgram);

router
  .route('/')
  .get(getAllUniversities)
  .post(protect, restrictTo('admin'), createUniversity);

const setTypeToUniversity = (req, res, next) => {
  req.body.onModelType = 'University';
  next();
};

router
  .route('/:universityId/programs')
  .get(universityProgramController.getAllProgramsForUniversity);

router.use('/:universityId/campuses', campusRouter);
router.use('/:universityId/reviews', setTypeToUniversity, reviewRouter);
router.use('/:universityId/questions', setTypeToUniversity, questionRouter);

router.route('/slug/:slug').get(getUniversityBySlug);

router
  .route('/:id')
  .get(getUniversity)
  .patch(
    protect,
    restrictTo('admin', 'moderator', 'university_manager'),
    ensureManagedUniversityMatch('id'),
    updateUniversity,
  )
  .delete(protect, restrictTo('admin'), deleteUniversity);

export default router;

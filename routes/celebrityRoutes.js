import express from 'express';
import {
  createCelebrity,
  deleteCelebrity,
  deleteCelebrityImages,
  getAllCelebrities,
  getCelebrity,
  getCelebrityBySlug,
  updateCelebrity,
  uploadCelebrityImages,
} from '../controllers/celebrityController.js';
import { protect, restrictTo } from '../controllers/authController.js';
import questionRouter from './questionRoutes.js';
import { createFieldsUpload } from '../middleware/uploadHandler.js';

const router = express.Router();

// --- Image Gallery Routes ---
router.patch(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator'),
  ...createFieldsUpload('celebrity-images'),
  uploadCelebrityImages
);

router.delete(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator'),
  deleteCelebrityImages
);

// --- Main CRUD Routes ---
router
  .route('/')
  .get(getAllCelebrities)
  .post(protect, restrictTo('admin'), createCelebrity);

// --- Nested Routes for Questions ---
const setTypeToCelebrity = (req, res, next) => {
  req.body.onModelType = 'Celebrity';
  next();
};

router.use('/:celebrityId/questions', setTypeToCelebrity, questionRouter);

// --- Slug and ID Specific Routes ---
router.route('/slug/:slug').get(getCelebrityBySlug);

router
  .route('/:id')
  .get(getCelebrity)
  .patch(protect, restrictTo('admin', 'moderator'), updateCelebrity)
  .delete(protect, restrictTo('admin'), deleteCelebrity);

export default router;

import express from 'express';
import {
  createProgram,
  deleteProgram,
  deleteProgramImages,
  getAllPrograms,
  getProgram,
  getProgramBySlug,
  getRarePrograms,
  updateProgram,
  uploadProgramImages,
} from '../controllers/programContorller.js';
import { protect, restrictTo } from '../controllers/authController.js';
import reviewRouter from './reviewRoutes.js';
import questionRouter from './questionRoutes.js';
import { createFieldsUpload } from '../middleware/uploadHandler.js';
import * as universityProgramController from '../controllers/universityProgramController.js';

const router = express.Router();

// --- Image Gallery Routes ---
router.patch(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator'),
  ...createFieldsUpload('program-images'), // Use a separate folder for program images
  uploadProgramImages
);

router.delete(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator'),
  deleteProgramImages
);

// --- Main CRUD Routes ---
router
  .route('/')
  .get(getAllPrograms)
  .post(protect, restrictTo('admin'), createProgram);

// --- Nested Routes for Reviews & Questions ---
// This middleware informs the nested routers that the parent model is 'Program'
const setTypeToProgram = (req, res, next) => {
  req.body.onModelType = 'Program';
  next();
};

router.route('/rare').get(getRarePrograms);

router
  .route('/:programId/universities')
  .get(universityProgramController.getAllUniversitiesForProgram);

router.use('/:programId/reviews', setTypeToProgram, reviewRouter);
router.use('/:programId/questions', setTypeToProgram, questionRouter);

// --- Slug and ID Specific Routes ---
router.route('/slug/:slug').get(getProgramBySlug);

router
  .route('/:id')
  .get(getProgram)
  .patch(protect, restrictTo('admin', 'moderator'), updateProgram)
  .delete(protect, restrictTo('admin'), deleteProgram);

export default router;

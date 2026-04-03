import express from 'express';
import {
  createUniversityProgram,
  deleteUniversityProgram,
  getAllUniversityPrograms,
  getUniversityProgram,
  updateUniversityProgram,
} from '../controllers/universityProgramController.js';
import { protect, restrictTo } from '../controllers/authController.js';

const router = express.Router();

router.route('/').get(getAllUniversityPrograms);

router.use(protect, restrictTo('admin', 'moderator'));

router.route('/').post(createUniversityProgram);

router
  .route('/:id')
  .get(getUniversityProgram)
  .patch(updateUniversityProgram)
  .delete(deleteUniversityProgram);

export default router;

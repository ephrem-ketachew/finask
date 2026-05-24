import express from 'express';
import {
  createUniversityProgram,
  deleteUniversityProgram,
  getAllUniversityPrograms,
  getUniversityProgram,
  updateUniversityProgram,
} from '../controllers/universityProgramController.js';
import { protect, restrictTo } from '../controllers/authController.js';
import {
  ensureManagedUniversityMatchesBody,
  ensureManagedProgramMatch,
} from '../middleware/ownershipMiddleware.js';

const router = express.Router();

router.route('/').get(getAllUniversityPrograms);

router.use(protect, restrictTo('admin', 'moderator', 'university_manager'));

router
  .route('/')
  .post(
    ensureManagedUniversityMatchesBody('university'),
    createUniversityProgram,
  );

router
  .route('/:id')
  .get(getUniversityProgram)
  .patch(ensureManagedProgramMatch('id'), updateUniversityProgram)
  .delete(ensureManagedProgramMatch('id'), deleteUniversityProgram);

export default router;

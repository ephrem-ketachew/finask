import express from 'express';
import {
  getAllQuestions,
  createQuestion,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  setParentInfo,
  checkQuestionOwnership,
  toggleLikeQuestion,
} from '../controllers/questionController.js';
import { protect, restrictTo } from '../controllers/authController.js';
import replyRouter from './replyRoutes.js';

// mergeParams is essential for nested routes
const router = express.Router({ mergeParams: true });

// NESTED ROUTE: All requests to /:questionId/replies will be handled by the replyRouter
router.use('/:questionId/replies', replyRouter);

// All subsequent routes are protected
router.use(protect);

router.route('/:id/like').patch(toggleLikeQuestion);

router
  .route('/')
  .get(getAllQuestions)
  .post(restrictTo('user'), setParentInfo, createQuestion);

router
  .route('/:id')
  .get(getQuestion)
  .patch(restrictTo('user', 'admin'), checkQuestionOwnership, updateQuestion)
  .delete(restrictTo('user', 'admin'), checkQuestionOwnership, deleteQuestion);

export default router;

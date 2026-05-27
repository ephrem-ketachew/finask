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
import { protect, protectOptional, restrictTo } from '../controllers/authController.js';
import replyRouter from './replyRoutes.js';

// mergeParams is essential for nested routes
const router = express.Router({ mergeParams: true });

// NESTED ROUTE: All requests to /:questionId/replies will be handled by the replyRouter
router.use('/:questionId/replies', replyRouter);

router.route('/:id/like').patch(protect, toggleLikeQuestion);

router
  .route('/')
  .get(protectOptional, getAllQuestions)
  .post(protect, restrictTo('user'), setParentInfo, createQuestion);

router
  .route('/:id')
  .get(protectOptional, getQuestion)
  .patch(protect, restrictTo('user', 'admin'), checkQuestionOwnership, updateQuestion)
  .delete(protect, restrictTo('user', 'admin'), checkQuestionOwnership, deleteQuestion);

export default router;

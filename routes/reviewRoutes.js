import express from 'express';
import {
  getAllReviews,
  createReview,
  getReview,
  updateReview,
  deleteReview,
  setParentInfo,
  checkReviewOwnership,
  toggleLikeReview,
} from '../controllers/reviewController.js';
import { protect, restrictTo } from '../controllers/authController.js';

// mergeParams is essential for nested routes to access parent IDs
const router = express.Router({ mergeParams: true });

// All routes are protected by default
router.use(protect);

router.route('/:id/like').patch(toggleLikeReview);

router
  .route('/')
  .get(getAllReviews)
  .post(restrictTo('user'), setParentInfo, createReview);

router
  .route('/:id')
  .get(getReview)
  .patch(restrictTo('user', 'admin'), checkReviewOwnership, updateReview)
  .delete(restrictTo('user', 'admin'), checkReviewOwnership, deleteReview);

export default router;

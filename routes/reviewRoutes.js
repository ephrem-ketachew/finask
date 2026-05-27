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
import { protect, protectOptional, restrictTo } from '../controllers/authController.js';

// mergeParams is essential for nested routes to access parent IDs
const router = express.Router({ mergeParams: true });

router.route('/:id/like').patch(protect, toggleLikeReview);

router
  .route('/')
  .get(protectOptional, getAllReviews)
  .post(protect, restrictTo('user'), setParentInfo, createReview);

router
  .route('/:id')
  .get(protectOptional, getReview)
  .patch(protect, restrictTo('user', 'admin'), checkReviewOwnership, updateReview)
  .delete(protect, restrictTo('user', 'admin'), checkReviewOwnership, deleteReview);

export default router;

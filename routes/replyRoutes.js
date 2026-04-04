import express from 'express';
import {
  getAllReplies,
  createReply,
  getReply,
  updateReply,
  deleteReply,
  setReplyData,
  checkReplyOwnership,
  toggleLikeReply,
} from '../controllers/replyController.js';
import { protect, restrictTo } from '../controllers/authController.js';

const router = express.Router({ mergeParams: true });

// Public read routes
router.route('/').get(getAllReplies);
router.route('/:id').get(getReply);

// All mutating routes require authentication
router.use(protect);

router.patch('/:id/like', toggleLikeReply);
router.route('/').post(restrictTo('user'), setReplyData, createReply);
router
  .route('/:id')
  .patch(restrictTo('user', 'admin'), checkReplyOwnership, updateReply)
  .delete(restrictTo('user', 'admin'), checkReplyOwnership, deleteReply);

export default router;

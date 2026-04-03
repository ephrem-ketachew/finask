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

router.use(protect);

router.patch('/:id/like', toggleLikeReply);

router
  .route('/')
  .get(getAllReplies)
  .post(restrictTo('user'), setReplyData, createReply);

router
  .route('/:id')
  .get(getReply)
  .patch(restrictTo('user', 'admin'), checkReplyOwnership, updateReply)
  .delete(restrictTo('user', 'admin'), checkReplyOwnership, deleteReply);

export default router;

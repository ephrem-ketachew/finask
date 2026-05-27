import express from 'express';
import { getAdminDashboardStats } from '../controllers/adminDashboardController.js';
import { protect, restrictTo } from '../controllers/authController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'moderator', 'university_manager'));

router.get('/dashboard/stats', getAdminDashboardStats);

export default router;

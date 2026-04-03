import express from 'express';
import { getAllInterests } from '../controllers/interestController.js';
import { protect } from '../controllers/authController.js';

const router = express.Router();

// Anyone who is logged in can see the list of interests
router.route('/').get(protect, getAllInterests);

export default router;

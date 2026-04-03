import express from 'express';
import { protectOptional } from '../controllers/authController.js';
import { trackClick } from '../controllers/interactionController.js';

const router = express.Router();

router.post('/track-click', protectOptional, trackClick);

export default router;

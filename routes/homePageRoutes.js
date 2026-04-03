import express from 'express';
import { getHomePageData } from '../controllers/homePageController.js';
import { protectOptional } from '../controllers/authController.js';

const router = express.Router();

router.route('/').get(protectOptional, getHomePageData);

export default router;

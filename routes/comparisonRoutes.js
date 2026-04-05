import express from 'express';
import rateLimit from 'express-rate-limit';
import { compareUniversities } from '../controllers/comparisonController.js';

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many comparison requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', aiLimiter, compareUniversities);

export default router;

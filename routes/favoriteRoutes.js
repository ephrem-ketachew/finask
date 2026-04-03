import express from 'express';
import { protect } from '../controllers/authController.js';
import {
  createFavorite,
  deleteFavorite,
  getAllFavorites,
  setUserIdForCreate,
} from '../controllers/favoriteController.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getAllFavorites).post(setUserIdForCreate, createFavorite);

router.route('/:id').delete(deleteFavorite);

export default router;

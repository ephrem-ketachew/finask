import express from 'express';
import {
  createCity,
  deleteCity,
  deleteCityImages,
  getAllCities,
  getCity,
  getCityBySlug,
  updateCity,
  uploadCityImages,
} from '../controllers/cityController.js';
import { protect, restrictTo } from '../controllers/authController.js';
import reviewRouter from './reviewRoutes.js';
import questionRouter from './questionRoutes.js';
import { createFieldsUpload } from '../middleware/uploadHandler.js';

const router = express.Router();

// --- Image Gallery Routes ---
router.patch(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator'),
  ...createFieldsUpload('city-images'),
  uploadCityImages
);

router.delete(
  '/:id/gallery',
  protect,
  restrictTo('admin', 'moderator'),
  deleteCityImages
);

// --- Main CRUD Routes ---
router
  .route('/')
  .get(getAllCities)
  .post(protect, restrictTo('admin'), createCity);

// --- Nested Routes for Reviews & Questions ---
// This middleware informs the nested routers that the parent model is 'City'
const setTypeToCity = (req, res, next) => {
  req.body.onModelType = 'City';
  next();
};

router.use('/:cityId/reviews', setTypeToCity, reviewRouter);
router.use('/:cityId/questions', setTypeToCity, questionRouter);

// --- Slug and ID Specific Routes ---
router.route('/slug/:slug').get(getCityBySlug);

router
  .route('/:id')
  .get(getCity)
  .patch(protect, restrictTo('admin', 'moderator'), updateCity)
  .delete(protect, restrictTo('admin'), deleteCity);

export default router;

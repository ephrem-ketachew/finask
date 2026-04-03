import express from 'express';
import {
  deleteMe,
  deleteUser,
  getAllUsers,
  getMe,
  getUser,
  updateMe,
  updateUser,
  createUser,
  getUserProfile,
  updateUserPhoto,
} from '../controllers/userController.js';
import {
  authorizePasswordReset,
  forgotPassword,
  googleSignIn,
  login,
  protect,
  resendVerificationEmail,
  resetPassword,
  restrictTo,
  signout,
  signup,
  updatePassword,
  verifyEmail,
  verifyResetCode,
} from '../controllers/authController.js';
import reviewRouter from './reviewRoutes.js';
import { createSingleUpload } from '../middleware/uploadHandler.js';
import { getMyReviews } from '../controllers/reviewController.js';
import {
  getAnsweredQuestions,
  getMyQuestions,
} from '../controllers/questionController.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/verifyEmail', verifyEmail);
router.post('/resendVerification', resendVerificationEmail);
router.post('/login', login);
router.post('/auth/google', googleSignIn);
router.post('/forgotPassword', forgotPassword);
router.post('/verifyResetCode', verifyResetCode);
router.patch('/resetPassword', authorizePasswordReset, resetPassword);

router.use(protect);

router.patch('/updatePassword', updatePassword);
router.delete('/deleteMe', deleteMe);
router.patch('/updateMe', updateMe);
router.patch(
  '/updateMe/photo',
  ...createSingleUpload('photo', 'user-profiles'),
  updateUserPhoto
);
router.get('/getMe', getMe, getUser);
router.post('/signout', signout);
router.get('/profile/:id', getUserProfile);
router.get('/me/reviews', getMyReviews);
router.get('/me/questions', getMyQuestions);
router.get('/me/answeredQuestions', getAnsweredQuestions);

router.use('/:userId/reviews', reviewRouter);

router.use(restrictTo('admin'));

router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

export default router;

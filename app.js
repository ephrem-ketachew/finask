import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import universityRoutes from './routes/universityRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import replyRoutes from './routes/replyRoutes.js';
import campusRouter from './routes/campusRoutes.js';
import cityRouter from './routes/cityRoutes.js';
import elevationZoneRouter from './routes/elevationZoneRoutes.js';
import programRouter from './routes/programRoutes.js';
import celebrityRouter from './routes/celebrityRoutes.js';
import favoriteRouter from './routes/favoriteRoutes.js';
import universityProgramRouter from './routes/universityProgramRoutes.js';
import interactionRouter from './routes/interactionRoutes.js';
import homePageRouter from './routes/homePageRoutes.js';
import searchRouter from './routes/searchRoutes.js';
import comparisonRouter from './routes/comparisonRoutes.js';
import interestRouter from './routes/interestRoutes.js';
import adminRouter from './routes/adminRoutes.js';

import { globalErrorHandler } from './middleware/errorHandler.js';
import AppError from './utils/appError.js';

const app = express();
// app.set('query parser', 'extended');

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(helmet());
app.use(xss());
app.use(mongoSanitize());
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  }),
);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/api/v1/universities', universityRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/replies', replyRoutes);
app.use('/api/v1/campuses', campusRouter);
app.use('/api/v1/cities', cityRouter);
app.use('/api/v1/elevation-zones', elevationZoneRouter);
app.use('/api/v1/programs', programRouter);
app.use('/api/v1/celebrities', celebrityRouter);
app.use('/api/v1/favorites', favoriteRouter);
app.use('/api/v1/university-programs', universityProgramRouter);
app.use('/api/v1/interactions', interactionRouter);
app.use('/api/v1/home', homePageRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/universities/compare', comparisonRouter);
app.use('/api/v1/interests', interestRouter);
app.use('/api/v1/admin', adminRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

export default app;

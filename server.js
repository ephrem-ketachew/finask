import mongoose from 'mongoose';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

import { calculateAndCacheTrending } from './services/trendingService.js';

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('UNACAUGHT EXCEPTION! 💥 SHUTTING DOWN...');
  process.exit(1);
});

dotenv.config({ path: './config.env' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import app from './app.js';

const dbUrl = process.env.DATABASE_URL.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(dbUrl)
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((err) => {
    console.error('DATABASE CONNECTION FAILED! 💥');
    console.error(err);
    process.exit(1);
  });

cron.schedule('0 2 * * *', () => {
  calculateAndCacheTrending();
});

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  // console.log(`Server is running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION! 💥 SHUTTING DOWN...');
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully...');
  server.close(() => {
    console.log('💥 Process terminated.');
  });
});

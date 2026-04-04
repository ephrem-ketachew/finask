import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AppError from '../utils/appError.js';

import University from '../models/universityModel.js';
import User from '../models/userModel.js';
import Review from '../models/reviewModel.js';
import Campus from '../models/campusModel.js';
import Celebrity from '../models/celebrityModel.js';
import City from '../models/cityModel.js';
import ElevationZone from '../models/elevationZoneModel.js';
import Favorite from '../models/favoriteModel.js';
import Interest from '../models/interestModel.js';
import Program from '../models/programModel.js';
import Question from '../models/questionModel.js';
import Reply from '../models/replyModel.js';
import TokenBlocklist from '../models/tokenBlocklistModel.js';

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE_URL.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

const models = {
  universities: University,
  users: User,
  reviews: Review,
  campuses: Campus,
  celebrities: Celebrity,
  cities: City,
  elevationZones: ElevationZone,
  favorites: Favorite,
  interests: Interest,
  programs: Program,
  questions: Question,
  replies: Reply,
  tokenBlocklist: TokenBlocklist,
  // universityPrograms are generated from live DB data — use `npm run seed:university-programs`
};

const allData = JSON.parse(
  fs.readFileSync('./dev-data/dev-data.json', 'utf-8')
);

const importData = async (modelName) => {
  const Model = models[modelName];
  const dataToImport = allData[modelName];

  if (!Model || !dataToImport) {
    throw new AppError(`Cannot find model or data for '${modelName}'.`, 404);
  }

  await Model.create(dataToImport, { validateBeforeSave: false });
  console.log(`✅ Data for '${modelName}' successfully loaded!`);
};

const deleteData = async (modelName) => {
  const Model = models[modelName];
  if (!Model) {
    throw new AppError(`Cannot find model for '${modelName}'.`, 404);
  }
  await Model.deleteMany();
  console.log(`✅ Data for '${modelName}' successfully deleted!`);
};

const run = async () => {
  try {
    await mongoose.connect(DB);
    console.log('DB connection successful!');

    const action = process.argv[2]; // --import or --delete
    const modelName = process.argv[3]; // e.g., 'users', 'programs'

    if (!action || !modelName) {
      const availableModels = `Available models: ${Object.keys(models).join(
        ', '
      )}`;
      throw new AppError(
        `Please provide an action (--import or --delete) and a model name.\n${availableModels}`,
        400
      );
    }

    if (action === '--import') {
      await importData(modelName);
    } else if (action === '--delete') {
      await deleteData(modelName);
    } else {
      throw new AppError(
        'Invalid action. Please use --import or --delete.',
        400
      );
    }
  } catch (err) {
    console.error('🚨 An error occurred:');
    console.error(err.message);
  } finally {
    await mongoose.connection.close();
    console.log('DB connection closed.');
    process.exit();
  }
};

run();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import University from '../models/universityModel.js';
import Program from '../models/programModel.js';
import Campus from '../models/campusModel.js';
import Review from '../models/reviewModel.js';
import Question from '../models/questionModel.js';
import User from '../models/userModel.js';

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE_URL.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

async function run() {
  await mongoose.connect(DB);
  console.log('--- COLLECTION STATS ---');
  console.log('Universities:', await University.countDocuments());
  console.log('Programs:', await Program.countDocuments());
  console.log('Campuses:', await Campus.countDocuments());
  console.log('Reviews:', await Review.countDocuments());
  console.log('Questions:', await Question.countDocuments());
  console.log('Users:', await User.countDocuments());
  
  // Let's print a sample university document to inspect its size/fields
  const sampleUni = await University.findOne();
  console.log('\nSample University fields:', Object.keys(sampleUni?.toObject() ?? {}));
  
  await mongoose.connection.close();
}

run();

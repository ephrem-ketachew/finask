import mongoose from 'mongoose';
import dotenv from 'dotenv';
import University from '../models/universityModel.js';

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE_URL.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

const FEATURED_NAMES = [
  'Addis Ababa University',
  'Bahir Dar University',
  'Jimma University',
  'University of Gondar',
  'Mekelle University',
  'Hawassa University',
];

const run = async () => {
  try {
    await mongoose.connect(DB);
    console.log('DB connection successful!');

    const result = await University.updateMany(
      { name: { $in: FEATURED_NAMES } },
      { $set: { isFeatured: true } }
    );

    console.log(`✅ Marked ${result.modifiedCount} universities as featured.`);

    const featured = await University.find({ isFeatured: true }).select('name');
    console.log('Featured universities:');
    featured.forEach((u) => console.log(' -', u.name));
  } catch (err) {
    console.error('🚨 Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

run();

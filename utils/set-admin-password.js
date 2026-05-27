import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE_URL.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

async function run() {
  await mongoose.connect(DB);
  const user = await User.findOne({ email: 'remythunderbolt@gmail.com' });
  if (user) {
    user.password = 'test1234';
    user.passwordConfirm = 'test1234';
    await user.save();
    console.log('✅ Admin password updated successfully!');
  } else {
    console.log('🚨 Admin user not found!');
  }
  await mongoose.connection.close();
}

run();

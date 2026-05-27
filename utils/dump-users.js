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
  const users = await User.find();
  console.log(users.map(u => ({ email: u.email, role: u.role })));
  await mongoose.connection.close();
}

run();

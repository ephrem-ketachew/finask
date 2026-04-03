import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Interest from '../models/interestModel.js';

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE_URL.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB)
  .then(() => console.log('DB connection successful for seeding!'));

// --- ALL INTERESTS FROM FIGMA ---
const interests = [
  // Academic & Career Interests
  { name: 'Coding', category: 'Academic & Career Interests' },
  { name: 'Programming', category: 'Academic & Career Interests' },
  { name: 'Robotics', category: 'Academic & Career Interests' },
  { name: 'AI & Machine Learning', category: 'Academic & Career Interests' },
  { name: 'Science Experiments', category: 'Academic & Career Interests' },
  { name: 'Mathematics', category: 'Academic & Career Interests' },
  { name: 'Astronomy', category: 'Academic & Career Interests' },
  { name: 'Research', category: 'Academic & Career Interests' },
  { name: 'Engineering Projects', category: 'Academic & Career Interests' },
  { name: 'Information Technology', category: 'Academic & Career Interests' },
  { name: 'Writing Articles', category: 'Academic & Career Interests' },
  { name: 'Public Speaking', category: 'Academic & Career Interests' },
  { name: 'Tutoring', category: 'Academic & Career Interests' },
  { name: 'Volunteering', category: 'Academic & Career Interests' },

  // Creative Interests
  { name: 'Graphic Design', category: 'Creative Interests' },
  { name: 'UI/UX Design', category: 'Creative Interests' },
  { name: 'Photography', category: 'Creative Interests' },
  { name: 'Drawing & Sketching', category: 'Creative Interests' },
  { name: 'Painting', category: 'Creative Interests' },
  { name: 'Animation', category: 'Creative Interests' },
  { name: 'Video Editing', category: 'Creative Interests' },
  { name: 'Music Composition', category: 'Creative Interests' },
  { name: 'Singing', category: 'Creative Interests' },
  { name: 'Poetry', category: 'Creative Interests' },
  { name: 'Blogging', category: 'Creative Interests' },
  { name: 'Fashion Design', category: 'Creative Interests' },

  // Learning & Personal Growth
  { name: 'Reading Books', category: 'Learning & Personal Growth' },
  { name: 'Learning New Languages', category: 'Learning & Personal Growth' },
  { name: 'Watching Documentaries', category: 'Learning & Personal Growth' },
  { name: 'Self-Development', category: 'Learning & Personal Growth' },
  { name: 'Studying History', category: 'Learning & Personal Growth' },
  { name: 'Exploring Cultures', category: 'Learning & Personal Growth' },

  // Tech & Digital
  { name: 'Gaming', category: 'Tech & Digital' },
  { name: 'App Development', category: 'Tech & Digital' },
  { name: 'Web Design', category: 'Tech & Digital' },
  { name: 'Tech Reviews', category: 'Tech & Digital' },
  { name: 'Crypto & Blockchain', category: 'Tech & Digital' },
  { name: 'Hacking (Ethical)', category: 'Tech & Digital' },
  { name: 'Building Websites', category: 'Tech & Digital' },
  { name: '3D Modeling', category: 'Tech & Digital' },
  { name: 'Electronics', category: 'Tech & Digital' },

  // Social & Cultural
  { name: 'Debating', category: 'Social & Cultural' },
  { name: 'Mentoring', category: 'Social & Cultural' },
  { name: 'Traveling', category: 'Social & Cultural' },
  { name: 'Networking', category: 'Social & Cultural' },
  { name: 'Organizing Events', category: 'Social & Cultural' },
  { name: 'Community Service', category: 'Social & Cultural' },
  { name: 'Cultural Exchange', category: 'Social & Cultural' },

  // Health & lifestyle
  { name: 'Meditation', category: 'Health & lifestyle' },
  { name: 'Yoga', category: 'Health & lifestyle' },
  { name: 'Working Out', category: 'Health & lifestyle' },
  { name: 'Cooking', category: 'Health & lifestyle' },
  { name: 'Nutrition', category: 'Health & lifestyle' },
  { name: 'Hiking', category: 'Health & lifestyle' },
  { name: 'Biking', category: 'Health & lifestyle' },
  {
    name: 'Sports (Football, Basketball, etc.)',
    category: 'Health & lifestyle',
  },

  // Entertainment & Hobbies
  { name: 'Watching Movies', category: 'Entertainment & Hobbies' },
  { name: 'TV Shows', category: 'Entertainment & Hobbies' },
  { name: 'Anime', category: 'Entertainment & Hobbies' },
  { name: 'Reading Manga', category: 'Entertainment & Hobbies' },
  { name: 'Podcast Listening', category: 'Entertainment & Hobbies' },
  { name: 'Stand-Up Comedy', category: 'Entertainment & Hobbies' },
  { name: 'Board Games', category: 'Entertainment & Hobbies' },
  {
    name: 'Collecting (Books, Stamps, etc.)',
    category: 'Entertainment & Hobbies',
  },
];

// --- SCRIPT FUNCTIONS ---

const importData = async () => {
  try {
    await Interest.create(interests);
    console.log('✅ Interests data successfully loaded!');
  } catch (err) {
    console.error(err);
  }
  process.exit();
};

const deleteData = async () => {
  try {
    await Interest.deleteMany();
    console.log('✅ Interests data successfully deleted!');
  } catch (err) {
    console.error(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

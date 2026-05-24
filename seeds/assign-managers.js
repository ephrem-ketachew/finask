import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import User from '../models/userModel.js';
import University from '../models/universityModel.js';

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE_URL.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

const usage = () => {
  console.log(
    'Usage: node seeds/assign-managers.js --file=seeds/manager-mapping.json [--dry-run]',
  );
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { file: null, dryRun: false };

  args.forEach((arg) => {
    if (arg.startsWith('--file=')) options.file = arg.split('=')[1];
    if (arg === '--dry-run') options.dryRun = true;
  });

  return options;
};

const run = async () => {
  const { file, dryRun } = parseArgs();
  if (!file) return usage();

  const mappingPath = path.resolve(file);
  if (!fs.existsSync(mappingPath)) {
    console.error(`Mapping file not found: ${mappingPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(mappingPath, 'utf-8');
  let mappings;
  try {
    mappings = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse mapping JSON:', err.message);
    process.exit(1);
  }

  await mongoose.connect(DB);
  console.log('DB connection successful!');

  const results = [];

  for (const entry of mappings) {
    const { userEmail, username, userId, universitySlug, universityId } = entry;

    let user = null;
    if (userId) user = await User.findById(userId).select('+active');
    if (!user && userEmail)
      user = await User.findOne({ email: userEmail }).select('+active');
    if (!user && username)
      user = await User.findOne({ username }).select('+active');

    if (!user) {
      console.warn(`User not found for mapping: ${JSON.stringify(entry)}`);
      results.push({ entry, status: 'user-not-found' });
      continue;
    }

    let university = null;
    if (universityId)
      university = await University.findById(universityId).select('_id slug');
    if (!university && universitySlug)
      university = await University.findOne({ slug: universitySlug }).select(
        '_id slug',
      );

    if (!university) {
      console.warn(
        `University not found for mapping: ${JSON.stringify(entry)}`,
      );
      results.push({ entry, status: 'university-not-found' });
      continue;
    }

    const oldRole = user.role;
    const oldManaged = user.managedUniversity
      ? String(user.managedUniversity)
      : null;

    const updates = {
      role: 'university_manager',
      managedUniversity: university._id,
    };

    if (dryRun) {
      console.log(
        `DRY RUN: would update user ${user.email} => role=${updates.role}, managedUniversity=${university.slug}`,
      );
      results.push({ entry, status: 'dry-run' });
      continue;
    }

    user.role = updates.role;
    user.managedUniversity = updates.managedUniversity;
    await user.save({ validateBeforeSave: false });

    console.log(
      `Updated user ${user.email}: role ${oldRole} -> ${user.role}; managedUniversity ${oldManaged} -> ${university._id}`,
    );
    results.push({ entry, status: 'updated' });
  }

  await mongoose.connection.close();
  console.log('DB connection closed.');

  const summary = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  console.log('Summary:', summary);
  process.exit(0);
};

run().catch((err) => {
  console.error('An error occurred:', err);
  process.exit(1);
});

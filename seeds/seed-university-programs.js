/**
 * seed-university-programs.js
 *
 * Generates realistic UniversityProgram link documents from whatever
 * University and Program documents currently exist in the database.
 *
 * WHY a dedicated script instead of a static JSON file:
 *   - The old dev-data/umiversity-program.json contained hardcoded ObjectIds
 *     that drifted out of sync with the seeded data (301 of 1024 links pointed
 *     to universities that no longer existed in dev-data.json).
 *   - By reading live _id values from the DB, this script is always consistent
 *     regardless of which seed run produced the current data.
 *
 * Run AFTER universities and programs are already seeded:
 *   node seeds/seed-university-programs.js
 *
 * Options (pass as CLI flags):
 *   --min-programs  Minimum programs per university  (default: 8)
 *   --max-programs  Maximum programs per university  (default: 25)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import University from '../models/universityModel.js';
import Program from '../models/programModel.js';
import UniversityProgram from '../models/universityProgramModel.js';

dotenv.config({ path: './config.env' });

// ─── Config ────────────────────────────────────────────────────────────────

const MIN_PROGRAMS = parseInt(
  process.argv.find((a) => a.startsWith('--min-programs='))?.split('=')[1] ?? 8
);
const MAX_PROGRAMS = parseInt(
  process.argv.find((a) => a.startsWith('--max-programs='))?.split('=')[1] ?? 25
);

const YEAR_MIN = 1950;
const YEAR_MAX = 2018;

// ─── Helpers ───────────────────────────────────────────────────────────────

const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Fisher-Yates shuffle — returns a new shuffled array */
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── Main ──────────────────────────────────────────────────────────────────

const seed = async () => {
  const DB = process.env.DATABASE_URL.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
  );

  await mongoose.connect(DB);
  console.log('✅ DB connection successful');

  const [universities, programs] = await Promise.all([
    University.find().select('_id name'),
    Program.find().select('_id name'),
  ]);

  if (universities.length === 0) {
    console.error('🚨 No universities found. Seed universities first.');
    process.exit(1);
  }
  if (programs.length === 0) {
    console.error('🚨 No programs found. Seed programs first.');
    process.exit(1);
  }

  console.log(
    `Found ${universities.length} universities and ${programs.length} programs.`
  );

  // Build link documents
  const links = [];

  for (const uni of universities) {
    const count = Math.min(
      randInt(MIN_PROGRAMS, MAX_PROGRAMS),
      programs.length
    );
    const selectedPrograms = shuffle(programs).slice(0, count);

    for (const prog of selectedPrograms) {
      links.push({
        university: uni._id,
        program: prog._id,
        yearOffered: randInt(YEAR_MIN, YEAR_MAX),
        graduatesCount: randInt(500, 28000),
      });
    }
  }

  // Replace all existing links atomically
  await UniversityProgram.deleteMany();
  const inserted = await UniversityProgram.insertMany(links, {
    ordered: false,
  });

  console.log(
    `✅ Created ${inserted.length} university-program links across ${universities.length} universities.`
  );
  console.log(
    `   Average programs per university: ${(inserted.length / universities.length).toFixed(1)}`
  );

  process.exit(0);
};

seed().catch((err) => {
  console.error('🚨 Seeding failed:', err.message);
  process.exit(1);
});

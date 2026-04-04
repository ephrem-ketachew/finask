/**
 * patch-ids.js
 *
 * Patches dev-data/dev-data.json by adding _id fields to every record.
 *
 * WHY: dev-data.json was exported without _id fields, but the cross-references
 * inside it (e.g. universities[].city, campuses[].university, etc.) contain the
 * ORIGINAL ObjectIds from the source database. Without restoring those exact IDs,
 * all relational links break on a fresh seed.
 *
 * HOW: This script collects every ObjectId that is referenced by child records,
 * then assigns those IDs to the parent records (in order). Any remaining records
 * that are not referenced by anyone else receive freshly-generated ObjectIds.
 * The result is a self-consistent JSON where every cross-reference points to a
 * real document.
 *
 * NOTE: The semantic mapping (e.g. "which university is in which city") may be
 * scrambled if the original export order differed, but all links will resolve —
 * which is all that matters for dev seeding.
 *
 * Run:  node seeds/patch-ids.js
 */

import fs from 'fs';
import { ObjectId } from 'mongodb';

const dataPath = './dev-data/dev-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// ─── 1. Collect every ObjectId referenced per collection ─────────────────────

const referencedCityIds = [
  ...new Set([
    ...data.universities.map((u) => u.city),
    ...data.favorites.filter((f) => f.onModel === 'City').map((f) => f.item),
  ]),
];

const referencedProgramIds = [
  ...new Set([
    ...data.campuses.flatMap((c) => c.programs ?? []),
    ...data.users.flatMap((u) => u.fieldsOfInterest ?? []),
    ...data.celebrities.flatMap((c) => c.recommendedPrograms ?? []),
    ...data.favorites
      .filter((f) => f.onModel === 'Program')
      .map((f) => f.item),
  ]),
];

const referencedUniversityIds = [
  ...new Set([
    ...data.campuses.map((c) => c.university),
    ...data.favorites
      .filter((f) => f.onModel === 'University')
      .map((f) => f.item),
  ]),
];

const referencedCelebrityIds = [
  ...new Set(
    data.favorites.filter((f) => f.onModel === 'Celebrity').map((f) => f.item)
  ),
];

const referencedUserIds = [...new Set(data.favorites.map((f) => f.user))];

// ─── 2. Assign IDs to each parent collection ─────────────────────────────────

function assignIds(records, referencedIds) {
  return records.map((rec, i) => ({
    ...rec,
    _id: referencedIds[i] ?? new ObjectId().toHexString(),
  }));
}

data.cities = assignIds(data.cities, referencedCityIds);
data.programs = assignIds(data.programs, referencedProgramIds);
data.universities = assignIds(data.universities, referencedUniversityIds);
data.celebrities = assignIds(data.celebrities, referencedCelebrityIds);

// Users: there are 15 user records but 16 unique user IDs in favorites.
// Assign IDs to the 15 users; drop favorites that reference the orphaned 16th ID.
data.users = assignIds(data.users, referencedUserIds.slice(0, data.users.length));
const validUserIds = new Set(data.users.map((u) => u._id));
const orphanedFavs = data.favorites.filter((f) => !validUserIds.has(f.user));
if (orphanedFavs.length > 0) {
  console.warn(
    `⚠️  Removed ${orphanedFavs.length} favorite(s) referencing the orphaned 16th user ID.`
  );
  data.favorites = data.favorites.filter((f) => validUserIds.has(f.user));
}

// elevationZones — referenced by cities via climate.elevationZone
const referencedElevationZoneIds = [
  ...new Set(
    data.cities.map((c) => c.climate?.elevationZone).filter(Boolean)
  ),
];
data.elevationZones = assignIds(data.elevationZones, referencedElevationZoneIds);

// ─── 3. Write patched file ────────────────────────────────────────────────────

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log('✅ dev-data.json patched successfully!');
console.log('   cities:        ', data.cities.length, 'records');
console.log('   programs:      ', data.programs.length, 'records');
console.log('   universities:  ', data.universities.length, 'records');
console.log('   campuses:      ', data.campuses.length, 'records');
console.log('   celebrities:   ', data.celebrities.length, 'records');
console.log('   users:         ', data.users.length, 'records');
console.log('   favorites:     ', data.favorites.length, 'records');
console.log('   elevationZones:', data.elevationZones.length, 'records');

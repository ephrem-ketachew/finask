import UniversityProgram from '../models/universityProgramModel.js';
import * as factory from './handlerFactory.js';

export const createUniversityProgram = factory.createOne(UniversityProgram);
export const getUniversityProgram = factory.getOne(
  UniversityProgram,
  { path: 'university', select: 'name slug' },
  { path: 'program', select: 'name slug' }
);
export const getAllUniversityPrograms = factory.getAll(UniversityProgram);
export const updateUniversityProgram = factory.updateOne(UniversityProgram);
export const deleteUniversityProgram = factory.deleteOne(UniversityProgram);

// --- HANDLER FOR: GET /api/v1/universities/:universityId/programs ---
// This handler populates the 'program' field.
export const getAllProgramsForUniversity = factory.getAll(UniversityProgram, {
  path: 'program',
  select: 'name slug field coverImage',
});

// --- HANDLER FOR: GET /api/v1/programs/:programId/universities ---
// This handler populates the 'university' field.
export const getAllUniversitiesForProgram = factory.getAll(UniversityProgram, {
  path: 'university',
  select: 'name slug coverImage city ratingsAverage',
});

import mongoose from 'mongoose';
import {
  createYearField,
  nonNegativeCountField,
} from '../utils/schemaHelpers.js';

const universityProgramSchema = new mongoose.Schema({
  university: {
    type: mongoose.Schema.ObjectId,
    ref: 'University',
    required: true,
  },
  program: {
    type: mongoose.Schema.ObjectId,
    ref: 'Program',
    required: true,
  },
  yearOffered: createYearField({
    fieldName: 'Year offered',
    required: false,
  }),
  graduatesCount: nonNegativeCountField,
});

universityProgramSchema.index({ university: 1, program: 1 }, { unique: true });

const UniversityProgram = mongoose.model(
  'UniversityProgram',
  universityProgramSchema
);

export default UniversityProgram;

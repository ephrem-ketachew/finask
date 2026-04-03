import mongoose from 'mongoose';

const interestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: [
      'Academic & Career Interests',
      'Creative Interests',
      'Learning & Personal Growth',
      'Tech & Digital',
      'Social & Cultural',
      'Health & lifestyle',
      'Entertainment & Hobbies',
    ],
  },
});

interestSchema.pre('save', function (next) {
  this.name = this.name.toLowerCase();
  next();
});

const Interest = mongoose.model('Interest', interestSchema);

export default Interest;

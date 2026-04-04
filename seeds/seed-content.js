import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

import User from '../models/userModel.js';
import Program from '../models/programModel.js';
import City from '../models/cityModel.js';
import University from '../models/universityModel.js';
import Campus from '../models/campusModel.js';
import Review from '../models/reviewModel.js';
import Question from '../models/questionModel.js';
import Reply from '../models/replyModel.js';

// Load environment variables
dotenv.config({ path: './config.env' });

// Prepare database connection string
const DB = process.env.DATABASE_URL.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

const seedContent = async () => {
  try {
    await mongoose.connect(DB);
    console.log('DB connection successful!');

    // --- 1. LOAD DATA FROM FILES ---
    const reviewsWithSlugs = JSON.parse(
      fs.readFileSync('./dev-data/reviews-with-slugs.json', 'utf-8')
    );
    const questionsWithSlugs = JSON.parse(
      fs.readFileSync('./dev-data/questions-with-slugs.json', 'utf-8')
    );
    const repliesData = JSON.parse(
      fs.readFileSync('./dev-data/replies.json', 'utf-8')
    );

    // --- 2. FETCH EXISTING DOCUMENTS FOR MAPPING ---
    const allUsers = await User.find().select('_id');
    const allPrograms = await Program.find().select('_id slug');
    const allCities = await City.find().select('_id slug');
    const allUniversities = await University.find().select('_id slug');
    const allCampuses = await Campus.find().select('_id slug');

    if (allUsers.length === 0) {
      console.error('🚨 Error: No users found. Please seed users first.');
      process.exit();
    }

    // Create maps for quick lookup of IDs by slug
    const programSlugMap = new Map(allPrograms.map((p) => [p.slug, p._id]));
    const citySlugMap = new Map(allCities.map((c) => [c.slug, c._id]));
    const universitySlugMap = new Map(
      allUniversities.map((u) => [u.slug, u._id])
    );
    const campusSlugMap = new Map(allCampuses.map((c) => [c.slug, c._id]));

    // Sets to track unique user-item assignments to prevent duplicate errors
    const assignedReviewPairs = new Set();
    const assignedQuestionPairs = new Set();

    // --- 3. PREPARE REVIEWS ---
    const reviewsToCreate = reviewsWithSlugs
      .map((reviewData) => {
        let onModelId, onModelType;
        if (reviewData.programSlug) {
          onModelId = programSlugMap.get(reviewData.programSlug);
          onModelType = 'Program';
        } else if (reviewData.citySlug) {
          onModelId = citySlugMap.get(reviewData.citySlug);
          onModelType = 'City';
        } else if (reviewData.universitySlug) {
          onModelId = universitySlugMap.get(reviewData.universitySlug);
          onModelType = 'University';
        } else if (reviewData.campusSlug) {
          onModelId = campusSlugMap.get(reviewData.campusSlug);
          onModelType = 'Campus';
        }

        if (!onModelId) {
          console.warn(`⚠️ Warning: No parent found for review. Skipping.`);
          return null;
        }

        // Find a unique user for this review
        let randomUser;
        let assignmentKey;
        let attempts = 0;
        do {
          randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
          assignmentKey = `${randomUser._id}-${onModelId}`;
          attempts++;
          if (attempts > allUsers.length) {
            console.warn(
              `⚠️ Warning: Could not find a unique user for a review on ${onModelType} ${onModelId}. Skipping.`
            );
            return null;
          }
        } while (assignedReviewPairs.has(assignmentKey));
        assignedReviewPairs.add(assignmentKey);

        // Assign random likes
        const numberOfLikes = Math.floor(Math.random() * 16);
        const shuffledUsers = [...allUsers].sort(() => 0.5 - Math.random());
        const likerIds = shuffledUsers
          .slice(0, numberOfLikes)
          .map((user) => user._id);

        return {
          review: reviewData.review,
          rating: reviewData.rating,
          user: randomUser._id,
          onModelId,
          onModelType,
          likes: likerIds,
        };
      })
      .filter(Boolean); // Filter out any null values

    // --- 4. PREPARE QUESTIONS ---
    const questionsToCreate = questionsWithSlugs
      .map((questionData) => {
        let onModelId, onModelType;
        if (questionData.programSlug) {
          onModelId = programSlugMap.get(questionData.programSlug);
          onModelType = 'Program';
        } else if (questionData.citySlug) {
          onModelId = citySlugMap.get(questionData.citySlug);
          onModelType = 'City';
        } else if (questionData.universitySlug) {
          onModelId = universitySlugMap.get(questionData.universitySlug);
          onModelType = 'University';
        } else if (questionData.campusSlug) {
          onModelId = campusSlugMap.get(questionData.campusSlug);
          onModelType = 'Campus';
        }

        if (!onModelId) {
          console.warn(`⚠️ Warning: No parent found for question. Skipping.`);
          return null;
        }

        // Find a unique user for this question
        let randomUser;
        let assignmentKey;
        let attempts = 0;
        do {
          randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
          assignmentKey = `${randomUser._id}-${onModelId}`;
          attempts++;
          if (attempts > allUsers.length) {
            console.warn(
              `⚠️ Warning: Could not find a unique user for a question on ${onModelType} ${onModelId}. Skipping.`
            );
            return null;
          }
        } while (assignedQuestionPairs.has(assignmentKey));
        assignedQuestionPairs.add(assignmentKey);

        // Assign random likes
        const numberOfLikes = Math.floor(Math.random() * 21);
        const shuffledUsers = [...allUsers].sort(() => 0.5 - Math.random());
        const likerIds = shuffledUsers
          .slice(0, numberOfLikes)
          .map((user) => user._id);

        return {
          question: questionData.question,
          temp_id: questionData.temp_id, // This is crucial for mapping later
          user: randomUser._id,
          onModelId,
          onModelType,
          likes: likerIds,
        };
      })
      .filter(Boolean); // Filter out any null values

    // --- 5. DELETE EXISTING CONTENT & CREATE NEW ---
    await Review.deleteMany();
    await Question.deleteMany();
    await Reply.deleteMany();

    const createdReviews = await Review.create(reviewsToCreate);
    const createdQuestions = await Question.create(questionsToCreate);
    console.log(
      `✅ Successfully created ${createdReviews.length} reviews and ${createdQuestions.length} questions!`
    );

    // --- 6. PREPARE AND CREATE REPLIES ---
    if (createdQuestions.length > 0 && repliesData.length > 0) {
      // Create a map from the temp_id to the new database _id
      // This works because Question.create returns docs in the same order as the input array.
      const questionTempIdMap = new Map();
      createdQuestions.forEach((doc, index) => {
        const originalTempId = questionsToCreate[index].temp_id;
        if (originalTempId) {
          questionTempIdMap.set(String(originalTempId), doc._id);
        }
      });

      const repliesToCreate = repliesData
        .map((replyData) => {
          const questionId = questionTempIdMap.get(
            String(replyData.question_temp_id) // Ensure type consistency
          );
          if (!questionId) {
            console.warn(
              `⚠️ Warning: No question found for temp_id '${replyData.question_temp_id}'. Skipping reply.`
            );
            return null;
          }

          // Assign a random user and likes
          const randomUser =
            allUsers[Math.floor(Math.random() * allUsers.length)];
          const numberOfLikes = Math.floor(Math.random() * 11);
          const shuffledUsers = [...allUsers].sort(() => 0.5 - Math.random());
          const likerIds = shuffledUsers
            .slice(0, numberOfLikes)
            .map((user) => user._id);

          return {
            reply: replyData.reply,
            user: randomUser._id,
            question: questionId,
            likes: likerIds,
          };
        })
        .filter(Boolean); // Filter out any null values

      if (repliesToCreate.length > 0) {
        const createdReplies = await Reply.create(repliesToCreate);
        console.log(
          `✅ Successfully created ${createdReplies.length} replies!`
        );
      } else {
        console.log('ℹ️ No valid replies to create.');
      }
    }

    // --- 7. UPDATE PARENT STATISTICS ---
    console.log('Updating parent document statistics...');
    const uniqueReviewParents = [
      ...new Set(createdReviews.map((r) => `${r.onModelType}-${r.onModelId}`)),
    ];
    const uniqueQuestionParents = [
      ...new Set(
        createdQuestions.map((q) => `${q.onModelType}-${q.onModelId}`)
      ),
    ];

    await Promise.all(
      uniqueReviewParents.map(async (parent) => {
        const [modelType, modelId] = parent.split('-');
        await Review.calcAverageRatings(
          new mongoose.Types.ObjectId(modelId),
          modelType
        );
      })
    );

    await Promise.all(
      uniqueQuestionParents.map(async (parent) => {
        const [modelType, modelId] = parent.split('-');
        await Question.updateQuestionCount(
          new mongoose.Types.ObjectId(modelId),
          modelType
        );
      })
    );

    console.log('✅ All parent statistics updated successfully!');
  } catch (err) {
    console.error('🚨 An error occurred:', err);
    process.exit(1);
  }

  // The post('save') hooks on Review and Question fire background DB calls
  // (calcAverageRatings / updateQuestionCount) that are not awaited inside
  // the hook itself. Calling mongoose.connection.close() immediately after
  // Promise.all() resolves kills those in-flight operations with a
  // MongoExpiredSessionError. Letting process.exit() handle cleanup is safe
  // here because all critical writes are already committed at this point.
  process.exit(0);
};

seedContent();

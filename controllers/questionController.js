import Question from '../models/questionModel.js';
import Reply from '../models/replyModel.js';
import * as factory from './handlerFactory.js';
import catchAsync from '../utils/catchAsync.js';
import { checkOwnership, toggleLike } from './controllerUtils.js';
import APIFeatures from '../utils/apiFeatures.js';
import { logInteraction } from '../utils/interactionLogger.js';

/**
 * Generic middleware to set parent info for nested routes.
 */
export const setParentInfo = (req, res, next) => {
  const parentId =
    req.body.onModelId ||
    req.params.universityId ||
    req.params.cityId ||
    req.params.campusId ||
    req.params.programId;

  req.body.onModelId = parentId;
  req.body.user = req.user.id;

  next();
};

/**
 * Handlers for user-centric routes (to be used in userRoutes.js)
 */
export const getMyQuestions = (req, res, next) => {
  req.query.user = req.user.id;
  factory.getAll(Question)(req, res, next);
};

export const getAnsweredQuestions = catchAsync(async (req, res, next) => {
  const userReplies = await Reply.find({ user: req.user.id }).select(
    'question'
  );
  const questionIds = [
    ...new Set(userReplies.map((reply) => reply.question.toString())),
  ];
  const questions = await Question.find({ _id: { $in: questionIds } });

  res.status(200).json({
    status: 'success',
    results: questions.length,
    data: {
      questions,
    },
  });
});

export const getAllQuestions = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.params.universityId) {
    filter.onModelId = req.params.universityId;
    filter.onModelType = 'University';
  } else if (req.params.campusId) {
    filter.onModelId = req.params.campusId;
    filter.onModelType = 'Campus';
  } else if (req.params.cityId) {
    filter.onModelId = req.params.cityId;
    filter.onModelType = 'City';
  } else if (req.params.programId) {
    filter.onModelId = req.params.programId;
    filter.onModelType = 'Program';
  } else if (req.params.celebrityId) {
    filter.onModelId = req.params.celebrityId;
    filter.onModelType = 'Celebrity';
  }

  const features = new APIFeatures(Question.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const docs = await features.query;

  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: {
      questions: docs,
    },
  });
});

export const createQuestion = catchAsync(async (req, res, next) => {
  const newQuestion = await Question.create(req.body);

  if (newQuestion.onModelType === 'University') {
    logInteraction({
      universityId: newQuestion.onModelId,
      eventType: 'createQuestion',
      userId: newQuestion.user,
    });
  }

  res.status(201).json({
    status: 'success',
    data: {
      question: newQuestion,
    },
  });
});

// Generic handlers created from our utility factories
export const checkQuestionOwnership = checkOwnership(Question);
export const toggleLikeQuestion = toggleLike(Question);

// Generic CRUD handlers created from the main handler factory
export const getQuestion = factory.getOne(Question, {
  path: 'replies',
  options: {
    limit: 5,
    sort: { createdAt: -1 },
  },
});
export const updateQuestion = factory.updateOne(Question);
export const deleteQuestion = factory.deleteOne(Question);

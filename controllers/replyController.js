import Reply from '../models/replyModel.js';
import catchAsync from '../utils/catchAsync.js';
import { parseAndGetMentionedUserIds } from '../utils/helpers.js';
import * as factory from './handlerFactory.js';
import {
  checkOwnership,
  toggleLike,
  setDataForNestedRoute,
} from './controllerUtils.js';

export const setReplyData = setDataForNestedRoute('question', 'questionId');

export const checkReplyOwnership = checkOwnership(Reply);

export const toggleLikeReply = toggleLike(Reply);

export const createReply = catchAsync(async (req, res, next) => {
  // Parse the reply text for any @-mentions
  const mentionedUserIds = await parseAndGetMentionedUserIds(req.body.reply);

  const newReply = await Reply.create({
    reply: req.body.reply,
    question: req.body.question,
    user: req.body.user,
    mentions: mentionedUserIds,
  });

  res.status(201).json({
    status: 'success',
    data: {
      reply: newReply,
    },
  });
});

export const getAllReplies = factory.getAll(Reply);
export const getReply = factory.getOne(Reply);
export const updateReply = factory.updateOne(Reply);
export const deleteReply = factory.deleteOne(Reply);

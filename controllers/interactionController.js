import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';
import { logInteraction } from '../utils/interactionLogger.js';

export const trackClick = catchAsync(async (req, res, next) => {
  const { universityId, eventType } = req.body;

  if (!universityId || !eventType) {
    return next(
      new AppError('University ID and event type are required.', 400)
    );
  }

  const validClickEvents = ['clickOfficialWebsite', 'clickSocialLink'];
  if (!validClickEvents.includes(eventType)) {
    return next(new AppError('Invalid click event type.', 400));
  }

  logInteraction({
    universityId,
    eventType,
    userId: req.user?._id,
  });

  res.status(200).json({ status: 'success', message: 'Interaction logged.' });
});

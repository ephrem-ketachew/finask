import Interest from '../models/interestModel.js';
import catchAsync from '../utils/catchAsync.js';

export const getAllInterests = catchAsync(async (req, res, next) => {
  const interests = await Interest.find();

  const groupedInterests = interests.reduce((acc, interest) => {
    const { category, name } = interest;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(name);
    return acc;
  }, {});

  res.status(200).json({
    status: 'success',
    data: {
      interests: groupedInterests,
    },
  });
});

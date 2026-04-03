import Interaction from '../models/interactionModel.js';
import SystemCache from '../models/systemCacheModel.js';

export const calculateAndCacheTrending = async () => {
  // console.log('Starting daily trending university calculation...');
  try {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const trendingResults = await Interaction.aggregate([
      {
        $match: {
          createdAt: { $gte: twoWeeksAgo },
          eventType: {
            $in: [
              'favoriteUniversity',
              'createReview',
              'clickOfficialWebsite',
              'createQuestion',
              'viewCampusDetails',
              'viewUniversityProfile',
              'clickSocialLink',
            ],
          },
        },
      },

      {
        $group: {
          _id: '$university',
          score: {
            $sum: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ['$eventType', 'favoriteUniversity'] },
                    then: 10,
                  },
                  { case: { $eq: ['$eventType', 'createReview'] }, then: 8 },
                  {
                    case: { $eq: ['$eventType', 'clickOfficialWebsite'] },
                    then: 6,
                  },
                  { case: { $eq: ['$eventType', 'createQuestion'] }, then: 5 },
                  {
                    case: { $eq: ['$eventType', 'viewCampusDetails'] },
                    then: 2,
                  },
                  {
                    case: { $eq: ['$eventType', 'viewUniversityProfile'] },
                    then: 1,
                  },
                  { case: { $eq: ['$eventType', 'clickSocialLink'] }, then: 1 },
                ],
                default: 0,
              },
            },
          },
        },
      },

      { $sort: { score: -1 } },

      { $limit: 10 },
    ]);

    const trendingUniversityIds = trendingResults.map((result) => result._id);

    await SystemCache.findOneAndUpdate(
      { key: 'trendingUniversities' },
      {
        value: trendingUniversityIds,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    // console.log('Successfully updated trending universities cache.');
  } catch (error) {
    // console.error('Error calculating trending universities:', error);
  }
};

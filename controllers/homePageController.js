/**
 * @file This file contains the controller for aggregating all data needed for the main homepage.
 * It intelligently adapts its response based on the user's authentication status.
 */

import {
  fetchFeatured,
  fetchTrending,
  fetchRarePrograms,
  fetchSuggestedByLocation,
  fetchSuggestedByProgram,
  fetchUniversitiesByLocation,
  fetchTopRankedUniversities,
  fetchTopRatedUniversities,
  fetchTopReviewedUniversities,
} from '../services/homepageService.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Orchestrates fetching all homepage data. For authenticated users, it provides
 * personalized content. For guests, it provides generic popular content as a fallback.
 */
export const getHomePageData = catchAsync(async (req, res, next) => {
  // 1. DEFINE PROMISES FOR EVERYONE (GUESTS AND LOGGED-IN USERS)
  const commonPromises = [
    fetchFeatured(),
    fetchTrending(),
    fetchRarePrograms({ limit: 4 }),
  ];

  let dynamicPromises;

  // 2. DEFINE DYNAMIC PROMISES BASED ON AUTHENTICATION STATUS
  if (req.user) {
    // For logged-in users, fetch personalized suggestions
    dynamicPromises = [
      fetchUniversitiesByLocation(req.user, { limit: 5 }),
      fetchSuggestedByLocation(req.user, { limit: 5 }),
      fetchSuggestedByProgram(req.user, { limit: 5 }),
    ];
  } else {
    // For guests, fetch popular "top" lists as a fallback
    dynamicPromises = [
      fetchTopRankedUniversities({ limit: 5 }),
      fetchTopRatedUniversities({ limit: 5 }),
      fetchTopReviewedUniversities({ limit: 5 }),
    ];
  }

  // 3. EXECUTE ALL PROMISES CONCURRENTLY
  const [commonResults, dynamicResults] = await Promise.all([
    Promise.allSettled(commonPromises),
    Promise.allSettled(dynamicPromises),
  ]);

  // 4. CONSTRUCT THE BASE RESPONSE
  const homepageData = {
    featured:
      commonResults[0].status === 'fulfilled' ? commonResults[0].value : [],
    trending:
      commonResults[1].status === 'fulfilled' ? commonResults[1].value : [],
    rarePrograms:
      commonResults[2].status === 'fulfilled' ? commonResults[2].value : [],
  };

  // 5. ADD DYNAMIC SECTIONS TO THE RESPONSE
  if (req.user) {
    homepageData.nearBy =
      dynamicResults[0].status === 'fulfilled' ? dynamicResults[0].value : [];
    homepageData.suggestedByLocation =
      dynamicResults[1].status === 'fulfilled' ? dynamicResults[1].value : [];
    homepageData.suggestedByProgram =
      dynamicResults[2].status === 'fulfilled' ? dynamicResults[2].value : [];
  } else {
    homepageData.topRanked =
      dynamicResults[0].status === 'fulfilled' ? dynamicResults[0].value : [];
    homepageData.topRated =
      dynamicResults[1].status === 'fulfilled' ? dynamicResults[1].value : [];
    homepageData.topReviewed =
      dynamicResults[2].status === 'fulfilled' ? dynamicResults[2].value : [];
  }

  // 6. SEND THE UNIFIED RESPONSE
  res.status(200).json({
    status: 'success',
    data: homepageData,
  });
});

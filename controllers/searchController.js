import { fetchMultiModelSearch } from '../services/searchService.js';
import catchAsync from '../utils/catchAsync.js';

export const getMultiSearchResults = catchAsync(async (req, res, next) => {
  const query = req.query.q || '';
  const limit = req.query.limit;

  const results = await fetchMultiModelSearch(query, { limit });

  res.status(200).json({
    status: 'success',
    data: results,
  });
});

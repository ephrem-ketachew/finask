import University from '../models/universityModel.js';
import Program from '../models/programModel.js';
import City from '../models/cityModel.js';

/**
 * Creates and executes an Atlas Search aggregation pipeline for a specific model.
 * @param {mongoose.Model} Model - The Mongoose model to search.
 * @param {string} query - The search term.
 * @param {string[]} paths - The field paths to search within (e.g., ['name']).
 * @param {string} selection - A space-separated string of fields to return.
 * @param {number} limit - The max number of results.
 * @returns {Promise<Array>}
 */
const runAutocompleteSearch = (Model, query, paths, selection, limit) => {
  const projection = selection.split(' ').reduce((acc, field) => {
    acc[field] = 1;
    return acc;
  }, {});

  projection._id = 1;
  projection.score = { $meta: 'searchScore' };

  const autocompleteClauses = paths.map((path) => {
    return {
      autocomplete: {
        query: query,
        path: path,
        tokenOrder: 'any',
        fuzzy: {
          maxEdits: 1,
        },
      },
    };
  });

  const pipeline = [
    {
      $search: {
        index: 'default',
        compound: {
          should: autocompleteClauses,
          minimumShouldMatch: 1,
        },
      },
    },
    { $limit: limit },
    {
      $project: projection,
    },
  ];
  return Model.aggregate(pipeline);
};

/**
 * Searches for documents across multiple collections by running parallel Atlas Search queries.
 * @param {string} query - The user's search term.
 * @param {object} [options={}] - Search options.
 * @param {number} [options.limit=5] - The number of results to return per category.
 * @returns {Promise<object>} A promise that resolves to an object with categorized search results.
 */
export const fetchMultiModelSearch = async (query, options = {}) => {
  const limit = parseInt(options.limit, 10) || 5;

  if (!query || query.trim() === '') {
    return { universities: [], programs: [], cities: [] };
  }

  const searchTasks = [
    runAutocompleteSearch(
      University,
      query,
      ['name', 'address.city'],
      'name slug coverImage address.city',
      limit
    ),
    runAutocompleteSearch(Program, query, ['name'], 'name slug field', limit),
    runAutocompleteSearch(City, query, ['name'], 'name slug coverImage', limit),
  ];

  const results = await Promise.allSettled(searchTasks);

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `Search failed for model at index ${index}:`,
        result.reason
      );
    }
  });

  const searchData = {
    universities: results[0].status === 'fulfilled' ? results[0].value : [],
    programs: results[1].status === 'fulfilled' ? results[1].value : [],
    cities: results[2].status === 'fulfilled' ? results[2].value : [],
  };

  return searchData;
};

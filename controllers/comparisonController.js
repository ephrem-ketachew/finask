import mongoose from 'mongoose';
import geolib from 'geolib';
import University from '../models/universityModel.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { generateComparisonSummary } from '../services/aiComparisonService.js';

const { getDistance, getCompassDirection } = geolib;

const GENERATIONAL_TAGS = ['firstgeneration', 'secondgeneration', 'thirdgeneration', 'fourthgeneration'];
const EXCELLENCE_TAGS = ['research', 'general', 'specialized', 'applied'];

const GENERATION_DISPLAY = {
  firstgeneration: 'First',
  secondgeneration: 'Second',
  thirdgeneration: 'Third',
  fourthgeneration: 'Fourth',
};

const EXCELLENCE_DISPLAY = {
  research: 'Research',
  general: 'General',
  specialized: 'Specialized',
  applied: 'Applied',
};

const REGION_DISPLAY = {
  addis: 'Addis Ababa',
  afar: 'Afar',
  amhara: 'Amhara',
  benishangul: 'Benishangul-Gumuz',
  cers: 'Central Ethiopia',
  dire: 'Dire Dawa',
  gambella: 'Gambella',
  harari: 'Harari',
  oromia: 'Oromia',
  sidama: 'Sidama',
  sers: 'South Ethiopia',
  somali: 'Somali',
  swepr: 'South West Ethiopia',
  tigray: 'Tigray',
};

const formatRating = (avg, qty) => {
  if (!avg) return null;
  if (!qty) return `${avg}`;
  const formatted = qty >= 1000 ? `${(qty / 1000).toFixed(1)}k` : qty;
  return `${avg} (${formatted})`;
};

const formatRank = (rank) => (rank ? `#${rank} in Ethiopia` : null);

const formatClimate = (climate) => {
  if (!climate) return null;
  const { minTemperature, maxTemperature, climateTag } = climate;
  const tempRange =
    minTemperature != null && maxTemperature != null
      ? `${minTemperature}–${maxTemperature}°C`
      : null;
  return [tempRange, climateTag].filter(Boolean).join(', ') || null;
};

const formatDistance = (userCoords, cityLocation) => {
  if (!userCoords || !cityLocation?.coordinates) return null;
  const [lng, lat] = cityLocation.coordinates;
  const from = { latitude: userCoords.lat, longitude: userCoords.lng };
  const to = { latitude: lat, longitude: lng };
  const meters = getDistance(from, to);
  const km = Math.round(meters / 1000);
  const direction = getCompassDirection(from, to);
  return `${km} km ${direction}`;
};

const extractFacts = (university, userCoords) => {
  const tags = university.tags || [];
  const city = university.city;
  const ap = university.academicProfile || {};
  const rank =
    university.rank?.eduRank?.ethiopiaRank ||
    university.rank?.uniRank?.ethiopiaRank ||
    null;

  const generationTag = tags.find((t) => GENERATIONAL_TAGS.includes(t));
  const excellenceTags = tags.filter((t) => EXCELLENCE_TAGS.includes(t));
  const isAutonomous = tags.includes('autonomous');

  return {
    abbreviation: ap.abbreviation || university.name.slice(0, 3).toUpperCase(),
    rank,
    ugPrograms: ap.undergraduateProgramsCount ?? null,
    climate: formatClimate(city?.climate),
    rating: formatRating(university.ratingsAverage, university.ratingsQuantity),
    region: city?.region ? REGION_DISPLAY[city.region] || city.region : null,
    distanceFromUser: formatDistance(userCoords, city?.location),
    airport: city?.cityProfile?.hasAirport != null
      ? city.cityProfile.hasAirport ? 'Available' : 'Not Available'
      : null,
    numberOfCampuses: ap.numberOfCampuses ?? null,
    yearFounded: ap.yearFounded ?? null,
    excellence: excellenceTags.map((t) => EXCELLENCE_DISPLAY[t] || t),
    generation: generationTag ? GENERATION_DISPLAY[generationTag] || generationTag : null,
    cityPopulation: city?.cityProfile?.population ?? null,
    autonomous: isAutonomous,
    city: city?.name || null,
  };
};

const buildComparisonRows = (universitiesWithFacts) => {
  const abbrs = universitiesWithFacts.map((u) => u.facts.abbreviation);

  const makeRow = (label, getter) => {
    const values = {};
    universitiesWithFacts.forEach((u) => {
      const val = getter(u.facts);
      values[u.facts.abbreviation] = val != null ? val : '—';
    });
    return { label, values };
  };

  return [
    makeRow('University Rank', (f) => formatRank(f.rank)),
    makeRow('UG Programs', (f) => f.ugPrograms),
    makeRow('Climate', (f) => f.climate),
    makeRow('Avg. Rating (Students)', (f) => f.rating),
    makeRow('Location (Region)', (f) => f.region),
    ...(universitiesWithFacts.some((u) => u.facts.distanceFromUser)
      ? [makeRow('Distance from Your City', (f) => f.distanceFromUser)]
      : []),
    makeRow('Airport', (f) => f.airport),
    makeRow('Number of Campuses', (f) => f.numberOfCampuses),
    makeRow('Founded', (f) => f.yearFounded),
    makeRow('Institutional Excellence', (f) =>
      f.excellence?.length ? f.excellence.join(' / ') : null
    ),
    makeRow('Generation', (f) => (f.generation ? `${f.generation} Generation` : null)),
    makeRow('City Population', (f) =>
      f.cityPopulation ? f.cityPopulation.toLocaleString() : null
    ),
    makeRow('Autonomous', (f) => (f.autonomous ? 'Yes' : 'No')),
  ].filter(
    (row) => !Object.values(row.values).every((v) => v === '—')
  );
};

export const compareUniversities = catchAsync(async (req, res, next) => {
  const { universityIds, userCoordinates } = req.body;

  if (!Array.isArray(universityIds) || universityIds.length < 2 || universityIds.length > 3) {
    return next(new AppError('Please provide 2 to 3 university IDs.', 400));
  }

  for (const id of universityIds) {
    if (!mongoose.isValidObjectId(id)) {
      return next(new AppError(`Invalid university ID: ${id}`, 400));
    }
  }

  const userCoords =
    userCoordinates?.lat != null && userCoordinates?.lng != null
      ? { lat: Number(userCoordinates.lat), lng: Number(userCoordinates.lng) }
      : null;

  const universities = await University.find({ _id: { $in: universityIds } })
    .select(
      'name slug coverImage academicProfile rank tags ratingsAverage ratingsQuantity bestKnownFor'
    )
    .populate(
      'city',
      'name region location climate.minTemperature climate.maxTemperature climate.climateTag cityProfile.hasAirport cityProfile.population'
    );

  const foundIds = universities.map((u) => u._id.toString());
  const missing = universityIds.find((id) => !foundIds.includes(id));
  if (missing) {
    return next(new AppError(`University not found: ${missing}`, 404));
  }

  const ordered = universityIds.map((id) =>
    universities.find((u) => u._id.toString() === id)
  );

  const universitiesWithFacts = ordered.map((u) => ({
    university: u,
    facts: extractFacts(u, userCoords),
  }));

  const aiInput = universitiesWithFacts.map(({ university, facts }) => ({
    name: university.name,
    abbreviation: facts.abbreviation,
    rank: facts.rank,
    ugPrograms: facts.ugPrograms,
    city: facts.city,
    region: facts.region,
    climate: facts.climate,
    rating: facts.rating,
    yearFounded: facts.yearFounded,
    excellence: facts.excellence,
    generation: facts.generation,
    autonomous: facts.autonomous,
    campuses: facts.numberOfCampuses,
    cityPopulation: facts.cityPopulation,
  }));

  const aiSummary = await generateComparisonSummary(aiInput);
  const comparisonFacts = buildComparisonRows(universitiesWithFacts);

  const responseUniversities = ordered.map((u, i) => ({
    id: u._id,
    name: u.name,
    slug: u.slug,
    abbreviation: universitiesWithFacts[i].facts.abbreviation,
    coverImage: u.coverImage,
    ratingsAverage: u.ratingsAverage,
    ratingsQuantity: u.ratingsQuantity,
    city: universitiesWithFacts[i].facts.city,
  }));

  res.status(200).json({
    status: 'success',
    data: {
      universities: responseUniversities,
      aiSummary,
      comparisonFacts,
    },
  });
});

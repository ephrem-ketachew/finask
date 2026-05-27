import { GoogleGenerativeAI } from '@google/generative-ai';

let _model = null;
const getModel = () => {
  if (!_model) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    _model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.7,
      },
    });
  }
  return _model;
};

const pickBest = (items, score) =>
  items.reduce((best, cur) => (score(cur) > score(best) ? cur : best), items[0]);

const pickLowest = (items, score) =>
  items.reduce((best, cur) => (score(cur) < score(best) ? cur : best), items[0]);

const parseRatingAvg = (ratingStr) => {
  // ratingStr is like "4.8 (1.1k)" or "4.2"
  if (!ratingStr) return null;
  const m = String(ratingStr).match(/^\s*([0-9]+(?:\.[0-9]+)?)\s*/);
  return m ? Number(m[1]) : null;
};

const fallbackSummary = (universities) => {
  if (!Array.isArray(universities) || universities.length < 2) return null;
  const list = universities.filter(Boolean);
  if (list.length < 2) return null;

  const bestRanked = pickLowest(list, (u) => (u.rank ?? 99999));
  const mostPrograms = pickBest(list, (u) => (u.ugPrograms ?? -1));
  const bestRated = pickBest(list, (u) => parseRatingAvg(u.rating) ?? -1);

  const names = list.map((u) => u.name).filter(Boolean);
  const regionSet = new Set(list.map((u) => u.region).filter(Boolean));
  const climateSet = new Set(list.map((u) => u.climate).filter(Boolean));

  const s1 = `You're comparing ${names.join(' vs ')}.`;
  const s2 =
    bestRanked?.rank != null
      ? `${bestRanked.name} leads on national standing (ranked #${bestRanked.rank} in Ethiopia).`
      : `No official rank is available for at least one of these universities.`;
  const s3 =
    mostPrograms?.ugPrograms != null
      ? `${mostPrograms.name} offers the broadest academic choice with ${mostPrograms.ugPrograms} undergraduate programs.`
      : `Program counts are incomplete, so academic breadth may vary.`;
  const s4 =
    bestRated && parseRatingAvg(bestRated.rating) != null
      ? `${bestRated.name} has the strongest student sentiment at about ${parseRatingAvg(bestRated.rating)}/5.`
      : `Student ratings are limited, so sentiment may be under-represented.`;

  const s5 =
    regionSet.size > 1 || climateSet.size > 1
      ? `Location-wise, the schools differ in ${regionSet.size > 1 ? 'region' : 'setting'}${
          climateSet.size > 1 ? ' and climate' : ''
        }, so prioritize the campus lifestyle and weather that fit you best.`
      : `They share similar location signals, so choose based on program fit and reputation.`;

  return [s1, s2, s3, s4, s5].filter(Boolean).slice(0, 5).join(' ');
};

const buildPrompt = (universities) => {
  const descriptions = universities
    .map((u) => {
      const parts = [
        `- ${u.name} (${u.abbreviation || u.name}):`,
        u.rank ? `ranked #${u.rank} in Ethiopia` : null,
        u.ugPrograms ? `${u.ugPrograms} UG programs` : null,
        u.city ? `located in ${u.city}` : null,
        u.region ? `(${u.region} region)` : null,
        u.climate ? `climate: ${u.climate}` : null,
        u.rating ? `student rating ${u.rating}/5` : null,
        u.yearFounded ? `founded ${u.yearFounded}` : null,
        u.excellence?.length ? `${u.excellence.join('/')} focus` : null,
        u.generation ? `${u.generation} generation university` : null,
        u.autonomous ? `autonomous` : null,
        u.campuses ? `${u.campuses} campuses` : null,
        u.cityPopulation ? `city population ~${u.cityPopulation.toLocaleString()}` : null,
      ].filter(Boolean);

      return parts.join(', ');
    })
    .join('\n');

  return `You are helping Ethiopian students compare universities. Based on the data below, write a concise 3–5 sentence comparison paragraph. Synthesize the information into meaningful insights about academic reputation, location lifestyle, program strengths, and suitability for different student priorities. Do not just restate the numbers.

Universities:
${descriptions}

Write the comparison paragraph:`;
};

export const generateComparisonSummary = async (universities) => {
  if (!process.env.GEMINI_API_KEY) {
    return fallbackSummary(universities);
  }

  try {
    const prompt = buildPrompt(universities);
    const result = await getModel().generateContent(prompt);
    const text = result.response.text();
    return text?.trim() || fallbackSummary(universities);
  } catch (err) {
    console.error('[AI Comparison] Gemini error:', err.message);
    return fallbackSummary(universities);
  }
};

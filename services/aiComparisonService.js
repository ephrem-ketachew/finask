import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    maxOutputTokens: 350,
    temperature: 0.7,
  },
});

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
    return null;
  }

  try {
    const prompt = buildPrompt(universities);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text?.trim() || null;
  } catch (err) {
    console.error('[AI Comparison] Gemini error:', err.message);
    return null;
  }
};

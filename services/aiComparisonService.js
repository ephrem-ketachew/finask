import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
let _model = null;

const getModel = () => {
  if (!_model) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    _model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      generationConfig: {
        maxOutputTokens: 1200,
        temperature: 0.5,
      },
    });
  }

  return _model;
};

const buildPrompt = (universities, preferences) => {
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
        u.airport ? `airport: ${u.airport}` : null,
        u.bestKnownFor?.length
          ? `best known for: ${u.bestKnownFor.join(', ')}`
          : null,
        u.cityPopulation
          ? `city population ~${u.cityPopulation.toLocaleString()}`
          : null,
      ].filter(Boolean);

      return parts.join(', ');
    })
    .join('\n');

  const preferencesBlock = preferences
    ? JSON.stringify(preferences, null, 2)
    : 'Not provided';

  return `You are an elite University Selection Counselor specialized in the Ethiopian higher education system.
Your task is to analyze the raw comparison facts of the requested universities and deliver a personalized evaluation.

INPUT CONTEXT:
- Comparison Table Data:
${descriptions}
- User Preferences (If provided):
${preferencesBlock}

CRITICAL INSTRUCTIONS:
1. If "interestedDepartment" is specified, heavily cross-reference each university's specialized institutes, bestKnownFor fields, or renowned flagship programs against this department.
2. If "mustHaveAmenities" contains "Airport", verify the "airport" fact field in your data matrix and weigh it heavily.
3. Keep the overall narrative structured, analytical, and honest.
4. CONCLUSION RULE: You MUST conclude the summary with an explicit, authoritative recommendation sentence. Identify exactly which university is the absolute best fit for this specific user based on their input.
5. FORMATTING RULE: The definitive choice/recommendation name and its core justifying factor MUST be rendered in clean, bold markdown syntax (**University Name**) so that it stands out instantly on the frontend UI layout.

Write a concise 3–5 sentence comparison paragraph that synthesizes academic reputation, location lifestyle, program strengths, and suitability for the user's priorities. Do not just restate the numbers.`;
};

export const generateComparisonSummary = async (
  universities,
  preferences = null,
) => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  try {
    const prompt = buildPrompt(universities, preferences);
    const result = await getModel().generateContent(prompt);
    const text = result.response.text();
    return text?.trim() || null;
  } catch (err) {
    console.error('[AI Comparison] Gemini error:', err.message);
    return null;
  }
};

# University Comparison API — Implementation Plan

## Overview

A new endpoint that accepts 2–3 university IDs, fetches their data (populating related cities), derives structured comparison facts from the existing schema, and returns both a Gemini-powered AI narrative summary and a structured key-facts table — mirroring the design shown.

---

## 1. Chosen AI Provider

**Google Gemini — `gemini-1.5-flash`**

| Reason | Detail |
|--------|--------|
| Speed | Flash model is the fastest Gemini variant (~1–2 s responses) |
| Cost | Generous free tier (60 req/min, 1M tokens/day) |
| SDK | Official `@google/generative-ai` npm package |
| Quality | Strong enough for concise paragraph-level text generation |

> Alternative considered: OpenAI `gpt-4o-mini` — similar speed/cost but requires a paid key from day one. Gemini's free tier is the better fit for early development.

---

## 2. Data Mapping — What Already Exists vs. What to Derive

Almost every comparison fact lives in the current schema already.

| UI Comparison Field | Source Field(s) | How |
|---------------------|-----------------|-----|
| University rank | `university.rank.eduRank.ethiopiaRank` (fallback `uniRank.ethiopiaRank`) | Direct read |
| UG Programs | `university.academicProfile.undergraduateProgramsCount` | Direct read |
| Climate | `city.climate` (elevationZone name + min/max temp strings) | Populate `university.city` |
| Avg. Rating | `university.ratingsAverage` + `university.ratingsQuantity` | Direct read |
| Location (Region) | `city.region` (Ethiopian region enum on City model) | Populate `university.city` |
| Distance from current city | `geolib.getDistance(userCoords, city.location.coordinates)` | Calculated at request time (`geolib` already installed) |
| Airport | `city.cityProfile.airport` (Boolean on City model) | Populate `university.city` |
| Number of campuses | `university.academicProfile.numberOfCampuses` | Direct read |
| Founded | `university.academicProfile.yearFounded` | Direct read |
| Institutional Excellence | Derived from `university.tags` — values: `research`, `general`, `specialized`, `applied` | Filter tags array |
| Generation | Derived from `university.tags` — values: `firstGeneration`…`fourthGeneration` | Filter tags array |
| City Population | `city.cityProfile.population` | Populate `university.city` |
| Autonomous | Derived from `university.tags` — value: `autonomous` | Check if tag present |
| Abbreviation (for table headers) | `university.academicProfile.abbreviation` | Direct read |

**No schema changes are required.** All data is already present.

---

## 3. New Files to Create

```
controllers/
  comparisonController.js   ← main request handler

routes/
  comparisonRoutes.js       ← mounts POST /compare

services/
  aiComparisonService.js    ← builds Gemini prompt + calls API
```

---

## 4. Files to Modify

| File | Change |
|------|--------|
| `app.js` | Import and mount `comparisonRoutes` at `/api/v1/universities/compare` |
| `config.env` | Add `GEMINI_API_KEY=<your_key>` |
| `package.json` | Add `@google/generative-ai` dependency |

---

## 5. Endpoint Specification

### `POST /api/v1/universities/compare`

**Auth:** Public (no `protect` middleware needed — comparison is a discovery feature).

**Rate limit:** Inherits the global 100 req/10 min limiter. For the AI call specifically, add a tighter in-controller guard: max 10 comparison requests per IP per minute (simple `express-rate-limit` instance on this route).

#### Request Body

```json
{
  "universityIds": ["<id1>", "<id2>"],          // required, 2–3 items
  "userCoordinates": { "lat": 9.03, "lng": 38.74 } // optional — for distance calc
}
```

#### Success Response `200 OK`

```json
{
  "status": "success",
  "data": {
    "universities": [
      { "id": "...", "name": "Addis Ababa University", "abbreviation": "AAU",
        "coverImage": "...", "ratingsAverage": 4.8, "ratingsQuantity": 11000,
        "city": "Addis Ababa" }
    ],
    "aiSummary": "Addis Ababa University offers broader program options...",
    "comparisonFacts": [
      {
        "label": "University Rank",
        "values": {
          "AAU": "#1 in Ethiopia",
          "BDU": "#3 in Ethiopia"
        }
      },
      {
        "label": "UG Programs",
        "values": { "AAU": 66, "BDU": 55 }
      }
      // ... one object per comparison row
    ]
  }
}
```

#### Error cases

| Condition | Status | Message |
|-----------|--------|---------|
| < 2 or > 3 IDs | 400 | `"Please provide 2 to 3 university IDs."` |
| Invalid ObjectId format | 400 | `"Invalid university ID: <id>"` |
| One or more not found | 404 | `"University not found: <id>"` |
| Gemini API failure | 200 | `aiSummary` field is `null`; facts still returned |

---

## 6. Controller Logic (`comparisonController.js`)

```
1. Parse & validate universityIds (2–3 valid ObjectIds)
2. Query University.find({ _id: { $in: ids } })
     .populate('city', 'name region climate cityProfile location')
     .select('name slug coverImage academicProfile rank tags ratingsAverage
              ratingsQuantity bestKnownFor')
3. Verify all requested IDs were found
4. For each university, build a `facts` object:
     - abbreviation    → academicProfile.abbreviation || name[0..2]
     - rank            → rank.eduRank?.ethiopiaRank  (format as "#N in Ethiopia")
     - ugPrograms      → academicProfile.undergraduateProgramsCount
     - climate         → city.climate (temp range string + elevationZone name)
     - ratingsAverage  → ratingsAverage + ratingsQuantity formatted
     - region          → city.region
     - distanceKm      → geolib.getDistance(userCoords, city.location) if coords provided
     - airport         → city.cityProfile.airport
     - numberOfCampuses→ academicProfile.numberOfCampuses
     - yearFounded     → academicProfile.yearFounded
     - excellence      → tags.filter(t => ['research','general','specialized','applied'].includes(t))
     - generation      → tags.find(t => t.endsWith('Generation')) → display name
     - cityPopulation  → city.cityProfile.population
     - autonomous      → tags.includes('autonomous')
5. Build comparison rows array (label + {abbr: value} map)
6. Call aiComparisonService.generateSummary(universitiesWithFacts)
7. Return combined response
```

---

## 7. AI Service Logic (`services/aiComparisonService.js`)

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function generateComparisonSummary(universities) {
  // Build a tightly scoped prompt with the key facts
  // Ask for a 3–5 sentence paragraph comparing the universities
  // Return the text, or null on failure (fail gracefully)
}
```

**Prompt design:**
- Give Gemini a compact JSON blob of the key facts per university
- Instruct it: _"Write a concise 3–5 sentence comparison paragraph aimed at Ethiopian students choosing between these universities. Focus on academic reputation, location lifestyle, costs, and program strengths. Do not repeat raw numbers — synthesize them."_
- Set `maxOutputTokens: 300` to keep responses short and fast

**Failure handling:** Wrap in try/catch; on any error log to console and return `null` so the endpoint always responds with facts even if AI is temporarily unavailable.

---

## 8. Route File (`routes/comparisonRoutes.js`)

```javascript
import express from 'express';
import { compareUniversities } from '../controllers/comparisonController.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 10,
  message: 'Too many comparison requests, please slow down.',
});

router.post('/', aiLimiter, compareUniversities);

export default router;
```

---

## 9. `app.js` Change

Add a single import + mount line (after the existing university route):

```javascript
import comparisonRouter from './routes/comparisonRoutes.js';
// ...
app.use('/api/v1/universities/compare', comparisonRouter);
```

> Mount this **before** the `app.all('*')` catch-all and before the generic university router if there is any wildcard overlap risk.

---

## 10. Environment Variable

Add to `config.env`:

```
GEMINI_API_KEY=AIza...
```

Get a key at: https://aistudio.google.com/app/apikey (free, no billing required for Flash).

---

## 11. Installation

```bash
npm install @google/generative-ai
```

---

## 12. Comparison Facts — Ordered Row List

The `comparisonFacts` array will always be returned in this fixed order:

| # | Label | Notes |
|---|-------|-------|
| 1 | University Rank | Ethiopia rank from eduRank or uniRank |
| 2 | UG Programs | `undergraduateProgramsCount` |
| 3 | Climate | Temp range + elevation zone label |
| 4 | Avg. Rating (Students) | `4.8 (11k)` formatted string |
| 5 | Location (Region) | City region display name |
| 6 | Distance from Your City | km + direction, only if `userCoordinates` provided |
| 7 | Airport | `"Available"` / `"Not Available"` |
| 8 | Number of Campuses | `numberOfCampuses` |
| 9 | Founded | `yearFounded` |
| 10 | Institutional Excellence | Derived from tags |
| 11 | Generation | Derived from tags |
| 12 | City Population | `cityProfile.population` |
| 13 | Autonomous | `"Yes"` / `"No"` |

---

## 13. File-by-File Implementation Order

1. **`npm install @google/generative-ai`** — add dependency
2. **`config.env`** — add `GEMINI_API_KEY`
3. **`services/aiComparisonService.js`** — standalone, no deps on new files
4. **`controllers/comparisonController.js`** — depends on service
5. **`routes/comparisonRoutes.js`** — depends on controller
6. **`app.js`** — wire the route

---

## 14. Caching Consideration (Optional / Phase 2)

The same two universities compared repeatedly will always return the same AI text. The existing `SystemCache` model (`key`, `value`, `lastUpdated`) can be reused:

- Cache key: `compare:${sortedIds.join('-')}`
- Store: the full `{ aiSummary, comparisonFacts }` blob
- TTL: 24 hours (set via `createdAt` + cron, matching the existing trending cron pattern)

This avoids redundant Gemini API calls for popular pairings without adding any new infrastructure.

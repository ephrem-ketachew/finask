# FinAsk API — local development

## Required environment (`config.env`)

- `DATABASE_URL` / `DATABASE_USERNAME` / `DATABASE_PASSWORD`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `FRONTEND_URL` — comma-separated SPA origins (e.g. `http://localhost:5173,http://localhost:5174`)
- Mail: `MAILTRAP_*` or `BREVO_*`, `EMAIL_FROM`
- Compare: `GEMINI_API_KEY` for `gemini-2.5-flash-lite` via `@google/generative-ai`
- Optional: Cloudinary vars for gallery uploads

## Run

```bash
cd finask
npm install
npm run dev
```

Server listens on `PORT` (default 3000). Health: `GET http://localhost:3000/api/v1/home`

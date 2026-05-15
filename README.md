<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/60c2955c-bef0-41d4-8dcc-ddbec95be891

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy To Vercel

This project is configured for Vercel with:

- Frontend build output from Vite (`dist`)
- Node.js serverless API routes under `api/`
- SPA fallback routing for client-side navigation

### 1) Import the repository

- In Vercel, click **Add New Project** and import:
  `https://github.com/mraaziqp/Projectcupid.git`

### 2) Build settings

Vercel should auto-detect the settings from `vercel.json`. If you set them manually, use:

- Build Command: `npm run build:client`
- Output Directory: `dist`

### 3) Environment variables

Add these in Vercel Project Settings -> Environment Variables:

- `GEMINI_API_KEY` (required)
- `BRIDGE_SECRET` (optional; defaults to `cupid-forever-bridge-2024` if omitted)

### 4) Redeploy

After adding environment variables, trigger a redeploy from the Vercel dashboard.

### 5) Quick verification

After deployment:

- Open `/api/health` and confirm the response is `{ "status": "ok" }`
- Use the app UI to generate a letter and confirm API calls succeed

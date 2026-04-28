# NagarSeva — Civic Complaint Portal

A React + Vite civic grievance portal with complaint filing, tracking, heatmap visualization, and admin analytics.

## What this project includes

- Complaint submission with image upload and location capture
- Complaint tracking and status updates
- Public heatmap and issue reporting map
- Admin dashboard for complaint analytics
- English / Hindi bilingual support
- Tailwind + Bootstrap styling and responsive UI

## Local setup

1. Install dependencies:

  npm install

2. Start the development server:

  npm run dev

3. Open the local URL shown in the terminal.

If port 3000 is already in use, Vite will choose the next available port automatically, such as 3009.

## Production build

  npm run build

## Important configuration

This project uses Firebase and AI integrations. To get full functionality, replace the placeholder values in:

- src/services/firebase.js
- src/utils/geminiAI.js

If Firebase is not configured, the app will still start locally, but complaint storage and image uploads will not work.

## Troubleshooting

- If npm run dev starts but the app does not appear, check the exact local URL printed by Vite.
- If the server starts on a port other than 3000, open that port in your browser.
- If the build fails, rerun npm run build and inspect the terminal error for the failing file.

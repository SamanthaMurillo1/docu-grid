# DocuGrid

DocuGrid is an AI-powered expense tracking and financial organization app. Upload a receipt or invoice, and OCR (via Gemini) extracts the vendor, date, totals, and line items automatically. Review and correct the extracted data, categorize it, map it to spreadsheet columns, and export to Excel — all while a running Firestore-backed dashboard tracks your spending by category, income vs. expenses over time, and net cash flow.

Built with a React/Vite frontend and a small Express server for local API routes (OCR extraction), backed by Firebase (Auth + Firestore).

## Features

- Email/password and Google sign-in, with clear per-error messaging
- Upload a receipt/invoice image → automatic OCR extraction (Gemini)
- Review and manually correct extracted data before saving
- Expense categorization (fixed category list, auto-assigned by the model, editable)
- Map extracted fields to custom Excel columns and export
- Income logging with categories
- Dashboard: total expenses, average per document, net (income − expenses), spending-by-category breakdown, and a daily/weekly/monthly income-vs-expense summary
- Profile panel: edit display name, change password (email/password accounts), view account stats

## Prerequisites

Install these before running the project:

- Node.js 20 LTS or newer
- npm, included with Node.js
- Git
- The [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`

Check your versions:

```bash
node --version
npm --version
git --version
firebase --version
```

## First-Time Setup

Clone the repo and enter the project folder:

```bash
git clone <REPO_URL>
cd docu-grid
```

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Edit `.env` and set:

```bash
GEMINI_API_KEY="your_gemini_api_key"
APP_URL="http://localhost:3000"
```

Do not commit `.env`. It is intentionally ignored because it contains local secrets.

### Firebase Setup

This project uses Firebase Auth and Firestore. If this is your first time running the project (or you're setting up a new Firebase project for it):

1. Log in to the Firebase CLI:
```bash
   firebase login
```
2. Confirm you're pointed at the right project — check `.firebaserc`, or run:
```bash
   firebase projects:list
```
3. **Firestore must be provisioned once per project** — declaring it in config does not create it. In the [Firebase Console](https://console.firebase.google.com), select the project → **Build → Firestore Database → Create database**. Choose production mode (this repo's `firestore.rules` already has real, owner-scoped rules).
4. Deploy the security rules:
```bash
   firebase deploy --only firestore:rules
```

If you ever see a console error like `Firestore: Database '(default)' not found`, it means step 3 above hasn't been done yet on the project you're pointed at.

> **Note on Firebase Storage:** this project intentionally does not use Firebase Storage (e.g. for profile photo uploads), since Storage requires the Blaze (pay-as-you-go) billing plan. Google account users still get a profile photo automatically via their Google account; everyone else gets an initial-letter avatar. If your team decides to add Storage-backed features later, see the git history around the "profile panel" commit for the Blaze plan requirement and what was scoped out because of it.

You do **not** need `firebase-admin-key.json` for local frontend development — that's only used by the Express server for privileged operations, and the app falls back to application default credentials if it's missing. If you do have a service account key for local admin work, keep it out of git; it's already listed in `.gitignore`.

## Run The App Locally

Start the dev server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

Keep the terminal running while you work. Stop the server with `Ctrl+C`.

## If Port 3000 Is Busy

If you see an error like `EADDRINUSE: address already in use 0.0.0.0:3000`, another local server is already using port `3000`.

Option 1: run on the alternate port:

```bash
npm run dev:alt
```

Then open:

```text
http://localhost:3001
```

Option 2: find and stop the process using port `3000`:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill <PID>
```

## Frontend Checks Before Pushing Code

Run TypeScript checks:

```bash
npm run lint
```

Run the test suite:

```bash
npm run test
```

Run a production build:

```bash
npm run build
```

All three should pass before opening a pull request or pushing shared code.

## Testing

Tests live under `tests/`, mirroring the structure of the source files they cover (e.g. `tests/utils/reportAggregation.test.ts` tests `src/utils/reportAggregation.ts`). We use [Vitest](https://vitest.dev).

```bash
npm run test          # run once
npm run test:watch    # re-run on file changes while developing
```

When adding new business logic that can be pulled out into a plain function (validation, data transforms, API-response parsing, etc.), prefer writing it as a standalone exported function rather than burying it inline in a component or route handler — it makes it testable without needing to render React or hit a real network/database. See `src/utils/authErrors.ts`, `src/utils/buildExportRows.ts`, or `lib/extractDocument.ts` for examples of logic that was deliberately extracted this way.

## Useful Scripts

```bash
npm run dev
```
Starts the local development server at `http://localhost:3000`.

```bash
npm run dev:alt
```
Starts the local development server at `http://localhost:3001`.

```bash
npm run lint
```
Runs TypeScript without emitting build files.

```bash
npm run test
```
Runs the automated test suite once.

```bash
npm run test:watch
```
Runs the automated test suite in watch mode.

```bash
npm run build
```
Builds the frontend and server bundle into `dist/`.

```bash
npm run start
```
Runs the already-built production server from `dist/server.js`.

```bash
npm run clean
```
Removes the `dist/` build output.

## Team Git Workflow

Before starting work:

```bash
git pull
npm install
```

Create a branch:

```bash
git checkout -b your-name/short-feature-name
```

Before pushing:

```bash
npm run lint
npm run test
npm run build
git status
```

Commit and push:

```bash
git add .
git commit -m "Describe your change"
git push
```

If you're deploying changes to Firestore rules or indexes:

```bash
firebase deploy --only firestore:rules
```

## Troubleshooting

If dependencies seem broken, reinstall from the lockfile:

```bash
rm -rf node_modules
npm ci
```

If the browser shows a blank page, check the terminal where `npm run dev` is running and fix any reported error.

If upload/OCR calls fail, confirm `GEMINI_API_KEY` is set in `.env` and restart `npm run dev`.

If login fails, confirm the Firebase project settings allow your local URL and test account.

If you see `Firestore: Database '(default)' not found` in the browser console, Firestore hasn't been provisioned on the Firebase project yet — see **Firebase Setup** above.

If `firebase deploy` fails with `Not in a Firebase app directory`, you're missing `firebase.json` and/or `.firebaserc` — see **Firebase Setup** above, or ask a teammate to share theirs (these files don't contain secrets and are safe to share/commit).

If TypeScript shows a red underline on `import { useState } from "react"` or similar, run `npm install -D @types/react @types/react-dom` and restart your editor's TS server.

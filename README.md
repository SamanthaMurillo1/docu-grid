# DocuGrid

DocuGrid is a React/Vite frontend with a small Express server for local API routes.

## Prerequisites

Install these before running the project:

- Node.js 20 LTS or newer
- npm, included with Node.js
- Git

Check your versions:

```bash
node --version
npm --version
git --version
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

Run a production build:

```bash
npm run build
```

Both commands should pass before opening a pull request or pushing shared code.

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
npm run build
```

Builds the frontend and server bundle into `dist/`.

```bash
npm run start
```

Runs the already-built production server from `dist/server.cjs`.

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
npm run build
git status
```

Commit and push:

```bash
git add .
git commit -m "Describe your change"
git push
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

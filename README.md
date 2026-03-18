# Civic Voice

A modern civic issue reporting platform where citizens can authenticate using mobile number + password, set a primary location, report local issues, upvote, comment, and track moderation status.

## Tech Stack

- Frontend: Next.js + React + TailwindCSS
- Backend: Node.js + Express + Prisma
- Database: PostgreSQL
- Authentication: mobile number + password with HttpOnly session cookie
- Image Storage: Cloudinary (with local file fallback)

## Features

- Password auth via mobile number
- Location selection: Country -> State -> District -> City/Village
- Location change restricted to once every 30 days
- Civic issue feed filtered by user location
- Sort by most upvoted / most recent
- Upvote with duplicate prevention
- Comments, spam/duplicate reporting
- Trending issues section
- Search and category filter
- Admin moderation dashboard
- Status tracking: Reported -> In Progress -> Resolved
- Mobile-first responsive UI with dark and light mode

## Project Structure

- `server/` Express API and Prisma schema
- `web/` Next.js application

## Backend Setup

1. Go to backend folder:
   - `cd server`
2. Start PostgreSQL (Docker):
   - `npm run db:up`
3. Install dependencies:
   - `npm install`
4. Create environment file:
   - copy `.env.example` to `.env`
5. Run Prisma setup:
   - `npm run prisma:generate`
   - `npm run prisma:migrate -- --name init`
6. Seed sample data:
   - `npm run prisma:seed`
7. Start API:
   - `npm run dev`

## Seeded Accounts

- Owner and admin access are configured through runtime flows and env settings.
- Use signup/login from the UI to create citizen accounts.

## Database Notes

- Full PostgreSQL persistence via Prisma
- Indexes tuned for location feed, trending, and moderation queries
- Upvote, comment, and spam-report APIs enforce same-location access

## Frontend Setup

1. Open new terminal and go to frontend folder:
   - `cd web`
2. Install dependencies:
   - `npm install`
3. Create env file:
   - copy `.env.local.example` to `.env.local`
4. Start frontend:
   - `npm run dev`
5. Visit:
   - `http://localhost:3000`

## Motion Enhancements

- Staggered section reveals on dashboard and admin pages
- Smooth list transitions for issue feed updates
- Animated issue cards with subtle lift-on-hover

## Default API Endpoints

- Auth:
   - `POST /api/auth/register-password`
   - `POST /api/auth/login-password`
   - `POST /api/auth/reset-password-otp`
   - `GET /api/auth/session`
   - `POST /api/auth/logout`
- Location:
  - `PUT /api/location/primary`
- Issues:
  - `GET /api/issues`
  - `GET /api/issues/trending`
  - `POST /api/issues`
  - `POST /api/issues/:id/upvote`
  - `POST /api/issues/:id/comments`
  - `POST /api/issues/:id/report`
- Admin:
  - `GET /api/admin/posts`
  - `PATCH /api/admin/posts/:id/status`
- Upload:
  - `POST /api/upload/image`

## Security Notes

- Password signup/login is handled by the backend; OTP is used only for forgot-password reset
- JWT-based authenticated routes use HttpOnly cookies
- Helmet, scoped CORS, and rate limiting enabled
- Uploads accept only JPEG, PNG, and WebP images up to 5 MB
- Unique database constraints prevent duplicate upvotes and duplicate spam reports

## Firebase OTP Setup (Forgot Password Only)

1. Create a Firebase project and enable Phone Authentication.
2. In Firebase Console, add allowed domains for local/dev usage.
3. In `web/.env.local`, set:
   - `NEXT_PUBLIC_FIREBASE_API_KEY="..."`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."`
   - `NEXT_PUBLIC_FIREBASE_APP_ID="..."`
4. In `server/.env`, set Firebase Admin service account values:
   - `FIREBASE_PROJECT_ID="..."`
   - `FIREBASE_CLIENT_EMAIL="..."`
   - `FIREBASE_PRIVATE_KEY="..."` (escape newlines as `\\n`)
5. Restart backend and frontend servers.

Localhost testing:
- Set `NEXT_PUBLIC_FIREBASE_USE_TEST_MODE=true` in `web/.env.local`
- In Firebase Console, add a fictional phone number and 6-digit code under Authentication -> Sign-in method -> Phone -> Phone numbers for testing
- Use that exact phone number on the login page and enter the configured code; no real SMS will be sent

Behavior:
- OTP challenge/verification is used only during forgot-password flow.
- Backend verifies Firebase ID token and allows password reset for that mobile number.

Required backend env:
- `JWT_SECRET` must be set
- `CORS_ORIGIN` should contain the allowed frontend origins as a comma-separated list

## Production Deployment

Recommended hosting layout:
- Frontend on `https://app.example.com`
- Backend on `https://api.example.com`

Recommended stack for this project:
- Neon for PostgreSQL
- Render for the Express API in `server/`
- Vercel for the Next.js app in `web/`

Container files included in this repo:
- `server/Dockerfile` builds the Express + Prisma API image
- `web/Dockerfile` builds the Next.js standalone image

Recommended deploy shape:
- Managed PostgreSQL database
- One backend container service from `server/`
- One frontend container service from `web/`

Example Docker build commands:
- Backend: `docker build -t civic-voice-api ./server`
- Frontend: `docker build -t civic-voice-web ./web`

Example Docker run commands:
- Backend: `docker run --env-file server/.env -p 5000:5000 civic-voice-api`
- Frontend: `docker run -e NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api -p 3000:3000 civic-voice-web`

Common host settings:
- Backend start command: `npm run prisma:deploy && npm start`
- Frontend build command: `npm run build`
- Frontend start command: `npm start`
- Backend health check: `GET /api/health`

Required frontend env:
- `NEXT_PUBLIC_API_BASE_URL="https://api.example.com/api"`
- `NEXT_PUBLIC_FIREBASE_API_KEY="..."`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."`
- `NEXT_PUBLIC_FIREBASE_APP_ID="..."`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="..."`
- `NEXT_PUBLIC_FIREBASE_USE_TEST_MODE="false"`

Required backend env:
- `DATABASE_URL="..."`
- `DIRECT_DATABASE_URL="..."` (Neon direct/non-pooler URL for Prisma migrations)
- `JWT_SECRET="..."`
- `CORS_ORIGIN="https://app.example.com"`
- `AUTH_COOKIE_SAME_SITE="none"` when frontend and backend are on different subdomains and you need cross-site cookies
- `AUTH_COOKIE_SECURE="true"` in production
- `AUTH_COOKIE_DOMAIN=".example.com"` when sharing cookie scope across subdomains
- `OWNER_ALLOWED_MOBILES="+918888888888"`
- `FIREBASE_PROJECT_ID="..."`
- `FIREBASE_CLIENT_EMAIL="..."`
- `FIREBASE_PRIVATE_KEY="..."`
- `TURNSTILE_SECRET_KEY="..."`
- `TURNSTILE_VERIFY_ENABLED="true"`
- `CLOUDINARY_CLOUD_NAME="..."`
- `CLOUDINARY_API_KEY="..."`
- `CLOUDINARY_API_SECRET="..."`

### Neon + Render + Vercel

Neon:
1. Create a Neon project and database.
2. Copy the pooled connection string into Render as `DATABASE_URL`.
3. Keep SSL enabled in the Neon connection string.

Render backend:
1. Create a new Blueprint or Web Service from this repo.
2. If using Blueprint, the included `render.yaml` provisions the API service from `server/`.
3. If creating the service manually, use root directory `server`.
4. Build command is not needed for Docker deploys because `server/Dockerfile` handles install and Prisma generation.
5. Start command is already baked into the image as `npm run prisma:deploy && npm start`.
6. Set these backend env values at minimum:
   - `DATABASE_URL=<your Neon connection string>`
   - `JWT_SECRET=<long random secret>`
   - `CORS_ORIGIN=https://<your-vercel-domain>`
   - `AUTH_COOKIE_SAME_SITE=none`
   - `AUTH_COOKIE_SECURE=true`
   - `AUTH_COOKIE_DOMAIN=`
   - `FIREBASE_PROJECT_ID=...`
   - `FIREBASE_CLIENT_EMAIL=...`
   - `FIREBASE_PRIVATE_KEY=...`
   - `TURNSTILE_SECRET_KEY=...`
   - `TURNSTILE_VERIFY_ENABLED=true`
   - `CLOUDINARY_CLOUD_NAME=...`
   - `CLOUDINARY_API_KEY=...`
   - `CLOUDINARY_API_SECRET=...`
7. After deploy, verify `https://<your-render-service>/api/health` returns `ok: true`.

Vercel frontend:
1. Import the repo into Vercel.
2. Set the project root directory to `web`.
3. Framework preset should resolve to Next.js.
4. Set these frontend env values:
   - `NEXT_PUBLIC_API_BASE_URL=https://<your-render-service>/api`
   - `NEXT_PUBLIC_FIREBASE_API_KEY=...`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID=...`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...`
   - `NEXT_PUBLIC_FIREBASE_APP_ID=...`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...`
   - `NEXT_PUBLIC_FIREBASE_USE_TEST_MODE=false`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY=...`
5. Add the deployed Vercel domain to Firebase Authorized Domains.

Cross-site auth note:
- If you use the default `*.vercel.app` frontend domain and default `*.onrender.com` backend domain, leave `AUTH_COOKIE_DOMAIN` empty.
- Keep `AUTH_COOKIE_SAME_SITE=none` and `AUTH_COOKIE_SECURE=true` so the browser sends the session cookie from Vercel to Render.
- If you later move both apps under the same parent domain, you can set `AUTH_COOKIE_DOMAIN=.example.com`.

Preview deployment note:
- `CORS_ORIGIN` is exact-match. For a stable production deploy, point Vercel to a custom production domain and use that exact origin in Render.
- If you want Vercel preview deployments to call the API, add each allowed preview origin to `CORS_ORIGIN` as a comma-separated value or relax this policy intentionally.

Production checklist:
1. Rotate all secrets before deploy. Do not reuse local `.env` credentials.
2. Enable Firebase Phone Authentication and add your deployed frontend domain to Firebase Authorized Domains.
3. Set `NEXT_PUBLIC_FIREBASE_USE_TEST_MODE=false` in deployment.
4. Configure Cloudinary for persistent uploads. Do not rely on local disk uploads in production.
5. Keep owner numbers only in `OWNER_ALLOWED_MOBILES`.
6. Share admin secret code using format `civic_service_state_district_city`.
7. Run backend migrations with `npm run prisma:deploy` before starting the API.
8. Verify one Citizen login, one Admin login, and one Owner login after deploy.

Suggested platform mapping:
- Render: create one PostgreSQL database, one Web Service for `server/`, and one Web Service for `web/`
- Railway: create one Postgres service, one service rooted at `server/`, and one service rooted at `web/`
- Fly.io / self-hosted VM: deploy both images separately and point them at a managed PostgreSQL instance

Role behavior in production:
- Any phone number can sign up/login with password.
- A user becomes `OWNER` only if the normalized number appears in `OWNER_ALLOWED_MOBILES`.
- A user can become `ADMIN` only by entering a valid secret code in the role page using format `civic_service_state_district_city`.
- All other authenticated users use the Citizen flow.

## Optional Production Additions

- Integrate real OTP gateway and Aadhaar verification provider
- Add notification service (SMS/push/email)
- Add map view (Google Maps)
- Add government department workflow automation
- Add background jobs and analytics


Project Done By-
N Chakradhar Singh
K Gagan Rohith

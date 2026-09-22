# Health Report Dashboard

A health community: track your pain on a realistic 3D body, keep your test reports, and — if you choose — find and talk with other people who have similar pain. Private by default; you decide what is shared.

## Features

- **User Authentication**: Secure login and registration system
- **Report Management**: Upload, view, and manage health test reports
- **Data Analysis**: Transpose and compare health metrics over time
- **Data Visualization**: Charts and graphs for trend analysis
- **3D Anatomy Explorer**: Realistic, individually selectable anatomy (2,234 structures across 15 body systems) with layer toggles, search, and camera views
- **Communities** *(new)*: 33 health communities in 8 categories (Breast Cancer, IBS, Colon & Rectal Cancer, Type 2 Diabetes, …). Joining is private — nobody else can see which ones you've joined
- **Friends** *(new)*: mutual connections with your consent; see friends' public posts in a feed
- **Research & new tests** *(new)*: recent PubMed studies for your communities, plus studies about new tests and screening
- **Physiology** *(new)*: vital-sign readings (blood pressure, heart rate, oxygen, temperature, breathing, weight) with trends and plain-language ranges, plus heart exams (ECG, echocardiogram, stress test, Holter, stethoscope exam), lung function, fitness tests and body composition
- **Insights & questions** *(new)*: after 6 pain logs (or 6 physiology records) every member gets a **free quick summary** made by this server's own code (no AI, nothing sent anywhere, effectively zero cost). Optionally they can take a **deeper AI look**, or **ask a question** in their own words; both use a cheap AI model, are opt-in with clear disclosure, and have a small monthly allowance. Never a diagnosis, and every result must be followed by a choice: take it to the doctor (printable summary) or limit the suggestions
- **3D heart** *(new)*: on Physiology → Heart, a heart that turns by itself (drag to turn, scroll to zoom), with layers (muscle, chambers, valves, coronary arteries, veins, vessels), a "See inside" mode, an optional illustrative beat at the member's latest heart rate, and plain-language notes for 24 structures. It is a general reference heart, not the member's own scan. The heart is packed out of the full atlas by `node scripts/extract-heart.js` into `digital-twin/public/models/heart.{json,bin.gz}` (about 1.2 MB, so the tab does not download the 35 MB atlas); re-run it only if the atlas changes
- **Pathology & gut microbiome** *(new)*: a Flagged results overview across all tests, and a Gut microbiome tab for microbiome sequencing, fecal calprotectin, stool analysis and breath (SIBO) tests: enter results, see trends and side-by-side comparisons, gut-symptom summary from the pain log, red-flag list, research feed and communities. Only markers with widely used reference ranges (calprotectin, pancreatic elastase, blood in stool, breath-test gas) are flagged; sequencing results are shown but never scored, because there is no agreed healthy microbiome
- **Hospital finder** *(new)*: a map on the dashboard lists hospitals and urgent-care clinics near the member's location (or a typed city/postcode) using free OpenStreetMap data. No API key and no cost; the position is rounded to ~1 km and never stored
- **Friendly Dashboard** *(new)*: greeting, getting-started checklist, friend activity, communities and research at a glance
- **Community**: Discussion threads tagged to body areas and pain types, "people like me" matching from opt-in shared pain entries, reactions ("I relate"), reporting, blocking, and a moderation console. Members appear only by a pseudonymous username
- **Pain Tracker**: Tap the exact spot on the 3D body where it hurts, then describe it — type, severity, when it started, pattern, triggers — and keep a log with markers on the model
- **User Profile**: Manage personal health information
- **Doctor Access**: Share reports with healthcare providers

## Project Structure

```
├── server.js                 # Express server entry point
├── package.json             # Server dependencies
├── .env.example            # Environment variables template
├── models/
│   ├── User.js            # User schema and model
│   ├── TestReport.js      # Test report schema and model
│   ├── PainEntry.js       # Pain entry schema and model
│   └── painConstants.js   # Pain vocabulary shared by model and routes
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── reports.js         # Report management routes
│   ├── pain.js            # Pain log routes
│   └── users.js           # User profile routes
├── middleware/
│   └── auth.js            # JWT authentication middleware
└── digital-twin/            # React frontend (Vite + TypeScript)
    ├── src/
    │   ├── auth/           # AuthContext, RequireAuth, token store
    │   ├── atlas/          # 3D anatomy viewer (Three.js) and model loading
    │   ├── components/
    │   │   ├── atlas/      # Layer panel, search, pain form, pain log
    │   │   └── layout/     # TopNav, AppShell
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── ReportDetailPage.tsx
    │   │   ├── ProfilePage.tsx
    │   │   ├── DataPage.tsx
    │   │   └── AnatomyPage.tsx   # 3D anatomy explorer + pain tracker
    │   ├── data/remote/    # API client
    │   ├── App.tsx         # Route tree
    │   └── main.tsx        # React entry point
    ├── public/models/      # BodyParts3D anatomy geometry (~33 MB, gzip)
    └── index.html
```

## Prerequisites

- Node.js 20 or newer
- MongoDB (local install for development; MongoDB Atlas or similar for a public launch)
- npm

## Installation & Setup

### 1. Backend Setup

```bash
# Clone the repository or navigate to the project
cd /path/to/Healthreport

# Install backend dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env — see the comments in it. MongoDB must be running; the server
# refuses to start without a database (there is no in-memory fallback).
```

**Development data** (never for production — the script refuses to run there):

```bash
npm run seed:dev        # demo login + fake "demo_*" members, pain entries and threads
# sign in with demo@test.com / demo-password-2026
```

**Making a moderator or admin** (run on the server; there is deliberately no web flow):

```bash
npm run make-admin -- <username> [admin|moderator|user]
```

**Tests** (need a local MongoDB; each test file uses its own throwaway database):

```bash
npm test
```

### 2. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Make sure MongoDB is running locally
mongod
```

**Option B: MongoDB Atlas**
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Update `MONGODB_URI` in `.env` with your connection string

### 3. Frontend Setup

```bash
# Navigate to the frontend directory
cd digital-twin

# Install frontend dependencies
npm install
```

## Running the Application

### Option 1: Run Backend and Frontend Separately

**Terminal 1 - Backend:**
```bash
npm run dev
# Server will run on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
npm run web
# Frontend will run on http://localhost:5183
```

### Option 2: Run Both Concurrently (from root directory)
```bash
npm run both
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Reports
- `GET /api/reports` - Get all reports for user (protected)
- `GET /api/reports/:id` - Get specific report (protected)
- `POST /api/reports` - Create new report (protected)
- `PUT /api/reports/:id` - Update report (protected)
- `DELETE /api/reports/:id` - Delete report (protected)
- `POST /api/reports/transpose/data` - Get transposed data (protected)

### Community (all protected)
- `GET/POST /api/community/threads`, `GET/PUT/DELETE /api/community/threads/:id` - discussions (filter by `system`, `partId`, `type`, `q`)
- `POST /api/community/threads/:id/replies`, `PUT/DELETE /api/community/replies/:id`
- `POST /api/community/threads/:id/support`, `.../replies/:id/support` - "I relate" toggle
- `GET /api/community/matches?entryId=` - members with similar *shared* pain, plus related threads
- `GET /api/community/regions/summary?partId=` - how many other members report pain in an area (withheld under 3)
- `GET /api/community/users/:handle` - public profile; `GET/POST/DELETE /api/community/blocks/:handle`
- `POST /api/community/reports` - report a thread, reply or member
- `GET/POST /api/mod/...` - moderator/admin only: report queue, hide/remove/suspend, roles, audit log
- `GET /api/account/export`, `DELETE /api/account` - download or permanently delete your data

### Communities, Friends and Research (all protected)
- `GET /api/groups` - every community by category, with whether *you* joined; `GET /api/groups/mine`; `GET /api/groups/:slug`
- `POST/DELETE /api/groups/:slug/join` - join or leave (idempotent; max 20)
- `GET /api/friends` - friends and requests; `GET /api/friends/activity` - friends' recent public posts
- `POST /api/friends/:handle` (request), `.../accept`, `.../decline`, `DELETE /api/friends/:handle`
- `GET /api/research?kind=research|tests&group=<slug>` - cached PubMed listings for your communities (or one community)
- Threads accept a `group` (you must have joined it); `GET /api/community/threads?group=<slug>` or `?mine=1` filters by community

### Vitals and AI insights (protected)
- `GET/POST /api/vitals`, `PUT/DELETE /api/vitals/:id` - vital-sign readings (validated to plausible ranges)
- Exam results are ordinary test reports with `testType` `Cardiac` or `Physical Exam` and an `examKind` in `results`; gut and microbiome results use `testType` `Microbiome` (`examKind`: `sequencing`, `calprotectin`, `stoolAnalysis`, `breathTest`)
- `GET /api/insights/status`, `PUT /api/insights/settings` (consent, on/off, max possibilities 1-3)
- `POST /api/insights/generate` `{kind: pain|physiology, mode: basic|deep, includeDetail?}` (`basic`, the default, is the free rules-based summary); `POST /api/insights/ask` `{question, includeContext?}`; `POST /api/insights/:id/follow-up`; `GET/DELETE /api/insights`
- `GET /api/mod/ai-usage` - admins only: what the AI features have cost over the last 30 days (no member or question text)

### Places (protected)
- `GET /api/places/nearby?lat=&lon=&radiusKm=1-50&type=hospital|clinic` - up to 25 places, nearest first (position rounded to 2 decimals server-side; not stored)
- `GET /api/places/geocode?q=` - candidate locations for a typed city or postcode

### Pain Log
- `GET /api/pain` - Get the user's pain entries, newest onset first (protected)
- `POST /api/pain` - Record a pain entry (protected)
- `PUT /api/pain/:id` - Update an entry, e.g. change severity or mark resolved (protected)
- `DELETE /api/pain/:id` - Delete an entry (protected)

Entries are **private by default**; `visibility: "community"` opts one in to matching. Entries store the structure that was tapped (`location.partId`, `partName`, `system`, `side`) and the exact 3D point, plus `painTypes`, `severity` (0-10), `onset`, `pattern`, `triggers`, `radiatesTo`, `notes`, and `status`. Every field is validated and whitelisted server-side, and entries can only be read or changed by their owner.

### User Profile
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)

## Usage

### Register/Login
1. Navigate to the application
2. Click "Register" to create a new account or "Login" with existing credentials
3. Fill in your health information (optional but recommended)

### Add Test Reports
1. Go to Dashboard
2. Click "+ Add New Report"
3. Fill in:
   - Test Name (e.g., "Blood Test")
   - Test Date
   - Test Type (Blood, Urine, Imaging, Genetic, Other)
   - Results (JSON format with key-value pairs)
   - Notes (optional)
4. Click "Save Report"

### View and Compare Data
1. Go to "Data Analysis" tab
2. Select metrics you want to compare
3. Choose between Table View or Chart View
4. Analyze trends and statistics

### Transpose Data
The transpose feature converts data so that:
- **Rows**: Individual test parameters (e.g., Hemoglobin, Glucose)
- **Columns**: Test dates
- This makes it easy to spot trends and compare values over time

### Log Pain
1. Open the **Anatomy** page and click **＋ Report pain**
2. Rotate the body and tap the spot where it hurts. To reach deeper structures, hide layers on the left first (or use a preset like *Skeleton* or *Organs*)
3. Describe what it feels like, how strong it is (0-10), when it started, how it behaves, and what brings it on or eases it
4. Save. The entry appears in your pain log and as a marker on the model — click a marker or a log entry to review, edit, mark resolved, or delete it

The tracker is a communication aid for talking to a clinician. It does not diagnose anything. It shows general "when to get urgent care" notes for severe pain and for chest or head pain.

### Manage Profile
1. Go to "Profile"
2. Click "Edit Profile" to update your information
3. Save changes

## Sample Test Data

To test the application, you can use this sample JSON for test results:

```json
{
  "hemoglobin": "13.5 g/dL",
  "hematocrit": "40%",
  "wbc": "7.2 K/uL",
  "platelets": "225 K/uL",
  "glucose": "95 mg/dL",
  "creatinine": "0.9 mg/dL"
}
```

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/health-report
JWT_SECRET=your_very_secure_secret_key_change_this_in_production
NODE_ENV=development
```

## Technologies Used

### Backend
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

### Frontend
- **React 18 + TypeScript** - UI library, built with Vite
- **React Router** - Client-side routing
- **Zustand** - State management (including a vanilla store for 60fps physiology playback)
- **Three.js** - 3D anatomy viewer (batched rendering, one draw call per body system)
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling

## Privacy and Safety Model

- **Cost.** The free summary is computed by our own code (about 10⁻⁷ dollars). Only the optional AI features cost real money (roughly 0.3-0.5 US cents each on the default Haiku model), and each member has a rolling 30-day allowance (2 deeper looks, 5 questions by default), so the worst case per member is a few cents a month. The pattern knowledge base behind the free summary (`lib/ai/knowledge/pain.js`) is a **draft that must be clinician-reviewed** before real use; until then every summary says so.
- **AI insights are opt-in, minimum-necessary and never a diagnosis.** Nothing is sent to the AI provider until the member agrees after seeing exactly what is and isn't sent. Only structured facts go out (no name, email, username, date of birth, calendar dates or contact details; notes and age range only if ticked per request). Writing that suggests distress gets support resources instead of an analysis. The server validates and caps whatever the model returns (plain text, at most 3 possibilities, doses / treatment instructions / claims of certainty removed), adds its own fixed disclaimer and warning signs, and blocks a new insight until the member has chosen *ask my doctor* or *limit the suggestions*. Without `ANTHROPIC_API_KEY` the feature reports itself unavailable; `AI_MOCK=1` (development only) shows clearly-labelled demo results.

- **The hospital finder does not keep locations.** The browser rounds the position to ~1 km, the server rounds it again, uses it for one lookup and discards it (never stored or logged). Lookups are made by the server (Overpass, falling back to Nominatim), so those services see the rounded area but not the member's IP. Answers are cached per rounded area for 6 hours, a failing server is skipped for 2 minutes, and if every service is down an older cached answer is served (marked as such) or a generic "busy" message. Everything returned is treated as untrusted: names are plain text, links must be http(s), ids are validated. **Map tiles are loaded by the member's browser directly** from `VITE_MAP_TILE_URL` (default: OpenStreetMap's own tile server, which is for light use only; use a commercial or self-hosted provider in production, and allow it in your site's `img-src` if you set a Content-Security-Policy). Map data is crowd-sourced, so listings can be incomplete or wrong (for example a clinic tagged as a hospital); the page says so.
- **Communities are private.** Your memberships are never returned to anyone but you, never shown on a profile, and member counts are hidden until a community has 3 or more members. (A discussion you post *in* a community is visible to all signed-in members, which can hint at your interest.)
- **Friends are mutual and consented.** Requests can be declined silently, a declined requester can't spam re-requests, blocking ends a friendship, and a block is indistinguishable from "no such member". Friends see only public posts — never pain logs, reports, or memberships.
- **Research feeds leak nothing about members.** PubMed is queried per *community topic* on a schedule (every community, whether or not anyone joined), never per member. Titles are stripped of markup and links are rebuilt from a validated numeric PubMed id. "New tests" means recent *studies* about diagnostics — not FDA approvals or availability.

- **Pseudonymous.** Other members see only a username (and optional bio). Real name, email, phone, date of birth, test reports and pain-entry notes never leave the server to other members.
- **Sharing is opt-in per entry.** Matching reveals only region, pain type, severity, pattern and a *coarse* duration — never notes, the exact spot, exact dates, or identity.
- **Small numbers are hidden.** Community counts are withheld unless at least 3 members are included.
- **Content rules.** Posts are plain text only; emails, phone numbers and links are rejected. Removed posts have their text erased.
- **Crisis handling.** Posts containing self-harm language are never blocked, but show support resources and are flagged to moderators first. This is a keyword check, not a substitute for trained crisis support.
- **Your data.** Members can export everything and delete their account (which erases private data and removes their posts).
- **Hardening.** Passwords are bcrypt-hashed (10+ characters, common ones rejected), sessions are revocable, all inputs are validated, ownership is enforced inside database queries, and rate limits cover sign-in, sign-up and posting.

**Before a public launch** (things software cannot do for you): have counsel review the Terms, Privacy Policy and Guidelines in `digital-twin/src/pages/LegalPages.tsx` (they are marked DRAFT), add email verification with an email provider, put the app behind HTTPS with `TRUST_PROXY` set, use a hosted database with backups, and arrange for someone to review the moderation queue regularly.

## Anatomy Data and Credits

The 3D anatomy is **BodyParts3D 4.0** (© The Database Center for Life Science, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)), an adult male reference anatomy. Geometry was simplified and packed for the browser by the open-source [Human Atlas](https://github.com/ashemag/human-atlas) project (MIT), whose viewer approach this app's `digital-twin/src/atlas/` adapts. See `digital-twin/public/ATTRIBUTION.md` and `digital-twin/src/atlas/LICENSE-human-atlas`. Keep these credits when redistributing.

The model represents one reference anatomy, not every human structure or variation.

## Security Considerations

1. **Change JWT_SECRET** in production
2. **Use HTTPS** in production
3. **Validate all inputs** server-side
4. **Use strong passwords** for MongoDB
5. **Implement rate limiting** for API endpoints
6. **Enable CORS properly** for production domains

## Future Enhancements

- [ ] Email notifications for test result anomalies
- [ ] Doctor dashboard for reviewing patient reports
- [ ] PDF export functionality for reports
- [ ] Multi-language support
- [ ] Mobile app version
- [ ] Integration with healthcare APIs
- [ ] Machine learning for trend prediction
- [ ] Appointment scheduling system

## Troubleshooting

### MongoDB Connection Error
```
Check if MongoDB is running and the connection string is correct
```

### Port Already in Use
```bash
# Change port in .env or kill the process using the port
```

### API Requests Failing
```
The Vite dev server proxies /api to the backend (digital-twin/vite.config.ts) -
make sure the backend is running, and that API_PROXY_TARGET matches its port if not 5000
```

### Frontend Not Loading
```bash
cd digital-twin
npm cache clean --force
rm -rf node_modules
npm install
npm run dev
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or suggestions, please create an issue in the repository. 

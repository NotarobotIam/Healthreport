# Health Report Dashboard - Setup Guide

## Quick Start (5 minutes)

### Prerequisites Check
- Node.js v14+ installed: `node --version`
- MongoDB running locally or Atlas account
- npm installed: `npm --version`

### Step 1: Backend Setup
```bash
# Navigate to project root
cd /path/to/Healthreport

# Install backend dependencies
npm install

# Create .env file from template
cp .env.example .env
```

### Step 2: Configure Environment
Edit `.env` file:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/health-report
JWT_SECRET=change_this_to_a_long_random_string_in_production
NODE_ENV=development
```

### Step 3: Frontend Setup
```bash
cd client
npm install
cd ..
```

### Step 4: Seed Sample Data (Optional)
```bash
npm run seed
# This creates a test user with sample health reports
# Email: john@example.com
# Password: password123
```

### Step 5: Start Application
```bash
# From project root - runs both backend and frontend
npm run both

# OR run separately:
# Terminal 1: npm run dev (backend on port 5000)
# Terminal 2: cd client && npm start (frontend on port 3000)
```

Visit: `http://localhost:3000`

---

## Detailed Setup Guide

### MongoDB Setup

#### Option A: Local MongoDB (macOS/Linux/Windows)

**macOS with Homebrew:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
1. Download from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run installer and follow wizard
3. MongoDB runs as Windows Service automatically

**Linux (Ubuntu):**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

**Verify MongoDB is running:**
```bash
mongosh  # or mongo for older versions
> db.version()  # Should return version number
> exit
```

#### Option B: MongoDB Atlas (Cloud)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free account
3. Create a new project and cluster
4. Click "Connect" and choose "Connection String"
5. Copy the connection string and update `.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/health-report?retryWrites=true&w=majority
```

---

## Project File Structure

```
Healthreport/
├── server.js              # Main Express server
├── seed.js               # Database seeder script
├── package.json          # Backend dependencies
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
│
├── models/
│   ├── User.js           # User schema
│   └── TestReport.js     # Report schema
│
├── routes/
│   ├── auth.js           # Login/Register endpoints
│   ├── reports.js        # Report CRUD endpoints
│   └── users.js          # Profile endpoints
│
├── middleware/
│   └── auth.js           # JWT verification
│
└── client/               # React Frontend
    ├── package.json
    ├── src/
    │   ├── index.js
    │   ├── App.js
    │   ├── api.js        # API client
    │   │
    │   ├── components/
    │   │   ├── Navigation.js
    │   │   └── Navigation.css
    │   │
    │   └── pages/
    │       ├── Login.js
    │       ├── Register.js
    │       ├── Dashboard.js
    │       ├── ReportDetail.js
    │       ├── TransposeView.js
    │       ├── Profile.js
    │       └── (corresponding CSS files)
    │
    └── public/
        └── index.html
```

---

## API Reference

All endpoints (except auth) require JWT token in header:
```
Authorization: Bearer <token>
```

### Authentication (`/api/auth`)

**Register User**
```
POST /register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "dateOfBirth": "1990-01-15",
  "gender": "Male",
  "phone": "555-0123"
}
Response: { token, user }
```

**Login**
```
POST /login
{
  "email": "john@example.com",
  "password": "password123"
}
Response: { token, user }
```

**Get Current User**
```
GET /me
Response: { user }
```

### Reports (`/api/reports`)

**Get All Reports**
```
GET /
Response: { reports: [...] }
```

**Get Single Report**
```
GET /:id
Response: { report }
```

**Create Report**
```
POST /
{
  "testName": "Blood Test",
  "testDate": "2024-01-15",
  "testType": "Blood",
  "results": {
    "hemoglobin": "13.5 g/dL",
    "glucose": "95 mg/dL"
  },
  "notes": "Normal results",
  "normal": true
}
Response: { report }
```

**Update Report**
```
PUT /:id
{
  "notes": "Updated notes",
  "normal": true
}
Response: { report }
```

**Delete Report**
```
DELETE /:id
Response: { message: "Report deleted" }
```

**Get Transposed Data**
```
POST /transpose/data
Response: { 
  testDates: [...],
  transposed: {
    "hemoglobin": { "date1": "13.5", "date2": "13.7" },
    ...
  }
}
```

### User Profile (`/api/users`)

**Get Profile**
```
GET /profile
Response: { user }
```

**Update Profile**
```
PUT /profile
{
  "name": "John Doe",
  "dateOfBirth": "1990-01-15",
  "gender": "Male",
  "phone": "555-0123"
}
Response: { user }
```

---

## Usage Scenarios

### Scenario 1: Upload Blood Test Results

1. Login to dashboard
2. Click "+ Add New Report"
3. Enter:
   - Test Name: "Blood Test - Complete"
   - Test Date: "2024-01-15"
   - Test Type: "Blood"
   - Results: `{"hemoglobin": "13.5 g/dL", "glucose": "95 mg/dL"}`
4. Click Save

### Scenario 2: Compare Metrics Over Time

1. Go to "Data Analysis" tab
2. You'll see all test parameters
3. Select specific metrics (e.g., glucose, hemoglobin)
4. Choose "Chart View" to see trends
5. Chart automatically updates showing value changes over time

### Scenario 3: Export Data for Doctor

1. Go to Data Analysis
2. Select metrics you want to discuss
3. Take screenshot or copy table data
4. Share with doctor

---

## Troubleshooting

### Issue: MongoDB Connection Error
**Error:** `MongoServerError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution:**
```bash
# Check MongoDB is running
mongosh

# If not running, start it:
# macOS: brew services start mongodb-community
# Windows: MongoDB runs as service
# Linux: sudo systemctl start mongod
```

### Issue: Port 5000 Already in Use
**Error:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Change port in .env to different number (e.g., 5001)
PORT=5001

# OR kill process using port 5000
# macOS/Linux:
lsof -ti:5000 | xargs kill -9

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue: CORS Errors in Console
**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**
- Check backend is running on `http://localhost:5000`
- Check `proxy` in `client/package.json` matches backend URL
- Restart both frontend and backend

### Issue: "Token Expired" Error
**Solution:**
- This is normal after 30 days
- Clear localStorage: `localStorage.clear()`
- Login again

### Issue: React App Won't Start
**Error:** Various npm errors

**Solution:**
```bash
cd client
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## NPM Commands

### Backend Commands
```bash
npm install          # Install dependencies
npm run dev         # Start with auto-reload (nodemon)
npm run seed        # Populate database with sample data
npm start           # Start production server
```

### Frontend Commands (from `client/` directory)
```bash
npm install         # Install dependencies
npm start           # Start development server
npm run build       # Build for production
npm test            # Run tests
```

### Root Commands (runs both)
```bash
npm run both        # Run backend + frontend concurrently
npm run client      # Only start frontend
npm run server      # Only start backend
```

---

## Testing the Application

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

**Get Reports (replace TOKEN with actual token):**
```bash
curl http://localhost:5000/api/reports \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

1. Import the API collection
2. Set variables:
   - `{{base_url}}` = `http://localhost:5000`
   - `{{token}}` = Token from login response
3. Test each endpoint

---

## Production Deployment

### Before Deploying

1. **Change JWT_SECRET**
   ```
   Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Enable HTTPS**
   - Use Let's Encrypt certificates
   - Update CORS origins

3. **Environment Variables**
   ```
   NODE_ENV=production
   MONGODB_URI=<Atlas connection string>
   JWT_SECRET=<long random string>
   ```

4. **Build Frontend**
   ```bash
   cd client && npm run build
   ```

### Deploy Backend (Example: Heroku)
```bash
git push heroku main
```

### Deploy Frontend (Example: Vercel)
```bash
npm install -g vercel
vercel
```

---

## Support & Next Steps

- Read [React Documentation](https://react.dev)
- Read [Express Documentation](https://expressjs.com)
- Read [MongoDB Documentation](https://docs.mongodb.com)
- Check GitHub Issues for known problems
- Create new issues for bugs or feature requests

Happy coding! 🚀

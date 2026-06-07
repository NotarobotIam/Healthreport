# Developer Quick Reference

## Project Overview
Full-stack health report management system with user authentication, test report CRUD operations, and data analysis/transpose features.

## Technology Stack
- **Backend:** Node.js + Express.js
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT
- **Frontend:** React 18 + React Router v6
- **Charts:** Recharts
- **Styling:** CSS3

---

## Quick Command Reference

```bash
# Setup
npm install                    # Install backend deps
cd client && npm install       # Install frontend deps

# Development
npm run dev                    # Start backend (with reload)
cd client && npm start        # Start frontend (separate terminal)
npm run both                  # Run backend + frontend together

# Database
npm run seed                  # Load sample data

# Production
cd client && npm run build    # Build React app
npm start                     # Start server
```

---

## File Structure Explanation

### Backend Files

| File | Purpose |
|------|---------|
| `server.js` | Main Express app setup |
| `models/User.js` | User schema & password hashing |
| `models/TestReport.js` | Report schema & methods |
| `routes/auth.js` | Login/register endpoints |
| `routes/reports.js` | CRUD operations & transpose |
| `routes/users.js` | Profile management |
| `middleware/auth.js` | JWT verification |
| `seed.js` | Sample data generator |

### Frontend Files

| File | Purpose |
|------|---------|
| `src/App.js` | Main app router |
| `src/api.js` | API client & HTTP calls |
| `src/pages/Login.js` | Login form |
| `src/pages/Register.js` | Registration form |
| `src/pages/Dashboard.js` | Report list & add form |
| `src/pages/TransposeView.js` | Data analysis & charts |
| `src/pages/ReportDetail.js` | View/edit single report |
| `src/pages/Profile.js` | User profile |
| `src/components/Navigation.js` | Header navigation |

---

## Key Features Implementation

### Authentication Flow
```
Register/Login → JWT Token → Store in localStorage → 
Add to API headers → Protected endpoints verify token
```

**Files Involved:**
- `routes/auth.js` - Token generation
- `middleware/auth.js` - Token verification
- `client/src/api.js` - Token injection
- `client/src/App.js` - Token management

### Report Management Flow
```
Form Input → API Call → Mongoose validation → 
MongoDB storage → Return to frontend → Update UI
```

**Files Involved:**
- `models/TestReport.js` - Schema
- `routes/reports.js` - Endpoints
- `client/pages/Dashboard.js` - UI
- `client/api.js` - HTTP calls

### Data Transpose Logic
```
Get all reports → Extract metrics → 
Group by metric & date → Format as table/chart → 
Display with statistics
```

**Files Involved:**
- `routes/reports.js` - `POST /transpose/data`
- `client/pages/TransposeView.js` - UI & charts
- `recharts` - Chart visualization

---

## API Endpoints Summary

### Auth Routes (`/api/auth`)
```
POST   /register          Create user account
POST   /login             Get JWT token
GET    /me                Get current user (protected)
```

### Report Routes (`/api/reports`)
```
GET    /                  All user reports (protected)
GET    /:id              Single report (protected)
POST   /                  Create report (protected)
PUT    /:id              Update report (protected)
DELETE /:id              Delete report (protected)
POST   /transpose/data   Get transposed data (protected)
```

### User Routes (`/api/users`)
```
GET    /profile          User profile (protected)
PUT    /profile          Update profile (protected)
```

---

## Adding a New Feature

### Example: Add Test Category Field

1. **Update Model** (`models/TestReport.js`)
```javascript
testCategory: {
  type: String,
  enum: ['Routine', 'Follow-up', 'Emergency'],
  default: 'Routine'
}
```

2. **Update Form** (`client/src/pages/Dashboard.js`)
```javascript
<select name="testCategory">
  <option>Routine</option>
  <option>Follow-up</option>
  <option>Emergency</option>
</select>
```

3. **API Automatically Supports** - No backend changes needed if validation passes

4. **Update TransposeView** (if needed for analysis)

---

## Debugging Tips

### Backend Debugging
```bash
# Check logs
npm run dev              # See all console.logs
# Use postman/curl to test endpoints
# Check database
mongosh
> use health-report
> db.reports.find()
```

### Frontend Debugging
```bash
# Browser DevTools (F12)
# Check Network tab for API calls
# Check Console for JavaScript errors
# React DevTools extension helpful
```

### Database Issues
```bash
# Connect to MongoDB
mongosh
# List collections
show collections
# Check documents
db.users.find()
db.testreports.find()
# Delete test data
db.users.deleteMany({})
```

---

## Common Modifications

### Change Database
1. Update `MONGODB_URI` in `.env`
2. Use MongoDB Atlas for cloud DB
3. Use local MongoDB for development

### Modify JWT Expiration
In `routes/auth.js`:
```javascript
jwt.sign(id, secret, { expiresIn: '7d' })  // Change duration
```

### Add New Report Fields
1. Add to `TestReport` schema
2. Add form input in `Dashboard.js`
3. Add display in `ReportDetail.js`

### Change Frontend Port
In `client/package.json`:
```json
"start": "PORT=3001 react-scripts start"
```

### Add Authentication to More Routes
In any `routes/file.js`:
```javascript
router.get('/', protect, async (req, res) => {
  // This route requires authentication
});
```

---

## Testing API Endpoints

### With cURL

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test","email":"test@test.com",
    "password":"pass123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'
```

**Get Reports (replace TOKEN):**
```bash
curl http://localhost:5000/api/reports \
  -H "Authorization: Bearer TOKEN"
```

### With Postman
1. POST to `/auth/login` to get token
2. Set `Authorization: Bearer TOKEN` in header
3. Test protected endpoints

---

## Performance Tips

### Frontend
- Use lazy loading for routes
- Memoize expensive components with `React.memo`
- Debounce search inputs
- Pagination for large report lists

### Backend
- Add indexes to frequently queried fields
- Use pagination for reports endpoint
- Cache transpose calculations
- Compress responses with gzip

### Database
- Index `userId` field in TestReport
- Index `email` field in User
- Periodic cleanup of old sessions

---

## Deployment Checklist

- [ ] Change `JWT_SECRET` to random string
- [ ] Set `NODE_ENV=production`
- [ ] Update `MONGODB_URI` to production database
- [ ] Enable HTTPS/SSL
- [ ] Set up monitoring/logging
- [ ] Configure backups
- [ ] Test all endpoints
- [ ] Set up CI/CD pipeline
- [ ] Document deployment process
- [ ] Plan disaster recovery

---

## Code Style Guidelines

### Backend
- Use `const` for variables
- Error handling with try-catch
- Return appropriate HTTP status codes
- Validate inputs before DB operations

### Frontend
- Functional components with hooks
- Separate styles into CSS files
- Use meaningful variable names
- Handle async/await with try-catch

---

## Documentation Files

- `README.md` - Overview & API reference
- `SETUP_GUIDE.md` - Installation & setup
- `FEATURES.md` - Detailed feature documentation
- `DEVELOPER_REFERENCE.md` - This file

---

## Quick Links

- GitHub: [Create repository]
- MongoDB: https://www.mongodb.com/cloud/atlas
- Express: https://expressjs.com/
- React: https://react.dev
- Mongoose: https://mongoosejs.com/

---

## Version Info

- Node.js: v14+
- React: 18.2.0
- Express: 4.18.2
- MongoDB: 5.0+

---

*Last Updated: 2024*
*For questions, create a GitHub issue or contact the development team*

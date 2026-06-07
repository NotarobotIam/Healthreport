# Health Report Dashboard

A full-stack web application for managing and analyzing health test reports with user authentication, data visualization, and metrics comparison.

## Features

- **User Authentication**: Secure login and registration system
- **Report Management**: Upload, view, and manage health test reports
- **Data Analysis**: Transpose and compare health metrics over time
- **Data Visualization**: Charts and graphs for trend analysis
- **User Profile**: Manage personal health information
- **Doctor Access**: Share reports with healthcare providers

## Project Structure

```
├── server.js                 # Express server entry point
├── package.json             # Server dependencies
├── .env.example            # Environment variables template
├── models/
│   ├── User.js            # User schema and model
│   └── TestReport.js      # Test report schema and model
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── reports.js         # Report management routes
│   └── users.js           # User profile routes
├── middleware/
│   └── auth.js            # JWT authentication middleware
└── client/                 # React frontend
    ├── src/
    │   ├── components/
    │   │   └── Navigation.js
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── Dashboard.js
    │   │   ├── ReportDetail.js
    │   │   ├── TransposeView.js
    │   │   └── Profile.js
    │   ├── api.js         # API client
    │   ├── App.js         # Main app component
    │   └── index.js       # React entry point
    └── public/
        └── index.html
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation & Setup

### 1. Backend Setup

```bash
# Clone the repository or navigate to the project
cd /path/to/Healthreport

# Install backend dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env and update MongoDB URI and JWT secret
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/health-report
# JWT_SECRET=your_secret_key_here
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
# Navigate to client directory
cd client

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
cd client
npm start
# Frontend will run on http://localhost:3000
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
- **React** - UI library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Recharts** - Data visualization

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

### CORS Errors
```
Make sure the proxy in client/package.json matches your backend URL
```

### React App Not Loading
```bash
cd client
npm cache clean --force
rm -rf node_modules
npm install
npm start
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or suggestions, please create an issue in the repository. 

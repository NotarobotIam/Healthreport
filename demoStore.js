// In-memory demo storage for testing without MongoDB
// This stores data temporarily while the app is running

class DemoStore {
  constructor() {
    this.users = new Map();
    this.reports = new Map();
    this.nextReportId = 1;
    
    // Add a pre-populated demo user
    this.users.set('demo@test.com', {
      _id: 'demo-user-123',
      name: 'Demo User',
      email: 'demo@test.com',
      password: '$2a$10$xu7Vy1DPLMitp0Wgiys3WugIV7Jtt8s6pEyAQnwRJB6dIuUdv4jzK', // bcrypt hashed 'password123'
      dateOfBirth: new Date('1990-01-15'),
      gender: 'Male',
      phone: '555-0123',
    });

    // Add some demo reports for the demo user
    this.reports.set('report-1', {
      _id: 'report-1',
      userId: 'demo-user-123',
      testName: 'Blood Test - CBC',
      testDate: new Date('2024-01-15'),
      testType: 'Blood',
      results: {
        hemoglobin: '13.5 g/dL',
        hematocrit: '40%',
        wbc: '7.2 K/uL',
        platelets: '225 K/uL',
      },
      doctor: {
        name: 'Dr. Smith',
        email: 'smith@clinic.com',
        clinic: 'General Health Clinic',
      },
      notes: 'Normal results. All values within expected range.',
      normal: true,
      createdAt: new Date('2024-01-15'),
    });

    this.reports.set('report-2', {
      _id: 'report-2',
      userId: 'demo-user-123',
      testName: 'Lipid Panel',
      testDate: new Date('2024-02-20'),
      testType: 'Blood',
      results: {
        totalCholesterol: '180 mg/dL',
        ldl: '110 mg/dL',
        hdl: '50 mg/dL',
        triglycerides: '100 mg/dL',
      },
      doctor: {
        name: 'Dr. Johnson',
        email: 'johnson@clinic.com',
        clinic: 'Cardiology Center',
      },
      notes: 'Cholesterol levels are good.',
      normal: true,
      createdAt: new Date('2024-02-20'),
    });

    this.reports.set('report-3', {
      _id: 'report-3',
      userId: 'demo-user-123',
      testName: 'Thyroid Function',
      testDate: new Date('2024-03-10'),
      testType: 'Blood',
      results: {
        tsh: '2.5 mIU/L',
        t3: '120 ng/dL',
        t4: '8.5 mcg/dL',
      },
      doctor: {
        name: 'Dr. Lee',
        email: 'lee@clinic.com',
        clinic: 'Endocrinology Center',
      },
      notes: 'Thyroid function normal.',
      normal: true,
      createdAt: new Date('2024-03-10'),
    });

    this.reports.set('report-4', {
      _id: 'report-4',
      userId: 'demo-user-123',
      testName: 'Blood Test - CBC',
      testDate: new Date('2024-04-18'),
      testType: 'Blood',
      results: {
        hemoglobin: '13.8 g/dL',
        hematocrit: '41%',
        wbc: '7.5 K/uL',
        platelets: '230 K/uL',
      },
      doctor: {
        name: 'Dr. Smith',
        email: 'smith@clinic.com',
        clinic: 'General Health Clinic',
      },
      notes: 'Slight improvement in hemoglobin levels.',
      normal: true,
      createdAt: new Date('2024-04-18'),
    });

    this.reports.set('report-5', {
      _id: 'report-5',
      userId: 'demo-user-123',
      testName: 'Lipid Panel',
      testDate: new Date('2024-05-25'),
      testType: 'Blood',
      results: {
        totalCholesterol: '175 mg/dL',
        ldl: '105 mg/dL',
        hdl: '52 mg/dL',
        triglycerides: '95 mg/dL',
      },
      doctor: {
        name: 'Dr. Johnson',
        email: 'johnson@clinic.com',
        clinic: 'Cardiology Center',
      },
      notes: 'Great improvement! Keep up the healthy diet.',
      normal: true,
      createdAt: new Date('2024-05-25'),
    });

    this.reports.set('report-6', {
      _id: 'report-6',
      userId: 'demo-user-123',
      testName: 'Thyroid Function',
      testDate: new Date('2024-06-12'),
      testType: 'Blood',
      results: {
        tsh: '2.3 mIU/L',
        t3: '122 ng/dL',
        t4: '8.7 mcg/dL',
      },
      doctor: {
        name: 'Dr. Lee',
        email: 'lee@clinic.com',
        clinic: 'Endocrinology Center',
      },
      notes: 'Stable thyroid levels.',
      normal: true,
      createdAt: new Date('2024-06-12'),
    });

    this.reports.set('report-7', {
      _id: 'report-7',
      userId: 'demo-user-123',
      testName: 'Blood Test - CBC',
      testDate: new Date('2024-07-20'),
      testType: 'Blood',
      results: {
        hemoglobin: '14.0 g/dL',
        hematocrit: '42%',
        wbc: '7.1 K/uL',
        platelets: '235 K/uL',
      },
      doctor: {
        name: 'Dr. Smith',
        email: 'smith@clinic.com',
        clinic: 'General Health Clinic',
      },
      notes: 'Excellent! Hemoglobin continues to improve.',
      normal: true,
      createdAt: new Date('2024-07-20'),
    });

    this.reports.set('report-8', {
      _id: 'report-8',
      userId: 'demo-user-123',
      testName: 'Lipid Panel',
      testDate: new Date('2024-08-28'),
      testType: 'Blood',
      results: {
        totalCholesterol: '170 mg/dL',
        ldl: '100 mg/dL',
        hdl: '55 mg/dL',
        triglycerides: '90 mg/dL',
      },
      doctor: {
        name: 'Dr. Johnson',
        email: 'johnson@clinic.com',
        clinic: 'Cardiology Center',
      },
      notes: 'Excellent lipid profile! Continue current regimen.',
      normal: true,
      createdAt: new Date('2024-08-28'),
    });

    this.reports.set('report-9', {
      _id: 'report-9',
      userId: 'demo-user-123',
      testName: 'Thyroid Function',
      testDate: new Date('2024-09-15'),
      testType: 'Blood',
      results: {
        tsh: '2.4 mIU/L',
        t3: '121 ng/dL',
        t4: '8.6 mcg/dL',
      },
      doctor: {
        name: 'Dr. Lee',
        email: 'lee@clinic.com',
        clinic: 'Endocrinology Center',
      },
      notes: 'Thyroid levels remain stable and healthy.',
      normal: true,
      createdAt: new Date('2024-09-15'),
    });

    this.reports.set('report-10', {
      _id: 'report-10',
      userId: 'demo-user-123',
      testName: 'Blood Test - CBC',
      testDate: new Date('2024-10-22'),
      testType: 'Blood',
      results: {
        hemoglobin: '13.9 g/dL',
        hematocrit: '41.5%',
        wbc: '7.3 K/uL',
        platelets: '232 K/uL',
      },
      doctor: {
        name: 'Dr. Smith',
        email: 'smith@clinic.com',
        clinic: 'General Health Clinic',
      },
      notes: 'All values remain within excellent range.',
      normal: true,
      createdAt: new Date('2024-10-22'),
    });

    this.reports.set('report-11', {
      _id: 'report-11',
      userId: 'demo-user-123',
      testName: 'Lipid Panel',
      testDate: new Date('2024-11-30'),
      testType: 'Blood',
      results: {
        totalCholesterol: '168 mg/dL',
        ldl: '98 mg/dL',
        hdl: '56 mg/dL',
        triglycerides: '88 mg/dL',
      },
      doctor: {
        name: 'Dr. Johnson',
        email: 'johnson@clinic.com',
        clinic: 'Cardiology Center',
      },
      notes: 'Outstanding results! Your heart health is excellent.',
      normal: true,
      createdAt: new Date('2024-11-30'),
    });

    this.reports.set('report-12', {
      _id: 'report-12',
      userId: 'demo-user-123',
      testName: 'Thyroid Function',
      testDate: new Date('2024-12-18'),
      testType: 'Blood',
      results: {
        tsh: '2.2 mIU/L',
        t3: '123 ng/dL',
        t4: '8.8 mcg/dL',
      },
      doctor: {
        name: 'Dr. Lee',
        email: 'lee@clinic.com',
        clinic: 'Endocrinology Center',
      },
      notes: 'Perfect thyroid function. All metrics optimal.',
      normal: true,
      createdAt: new Date('2024-12-18'),
    });
  }

  // User methods
  findUserByEmail(email) {
    return this.users.get(email);
  }

  findUserById(id) {
    for (let user of this.users.values()) {
      if (user._id === id) return user;
    }
    return null;
  }

  createUser(userData) {
    const user = {
      _id: 'user-' + Math.random().toString(36).substr(2, 9),
      ...userData,
    };
    this.users.set(userData.email, user);
    return user;
  }

  // Report methods
  getReportsByUserId(userId) {
    const userReports = [];
    for (let report of this.reports.values()) {
      if (report.userId === userId) {
        userReports.push(report);
      }
    }
    return userReports.sort((a, b) => new Date(b.testDate) - new Date(a.testDate));
  }

  getReportById(id) {
    return this.reports.get(id);
  }

  createReport(reportData) {
    const report = {
      _id: 'report-' + this.nextReportId++,
      ...reportData,
      createdAt: new Date(),
    };
    this.reports.set(report._id, report);
    return report;
  }

  updateReport(id, updateData) {
    const report = this.reports.get(id);
    if (report) {
      Object.assign(report, updateData);
      return report;
    }
    return null;
  }

  deleteReport(id) {
    return this.reports.delete(id);
  }
}

module.exports = new DemoStore();

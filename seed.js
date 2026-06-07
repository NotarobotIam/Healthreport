#!/usr/bin/env node

/**
 * Sample Data Seeder
 * This script populates the database with sample health test reports
 * Run with: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const TestReport = require('./models/TestReport');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/health-report');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await TestReport.deleteMany({});
    console.log('Cleared existing data');

    // Create sample user
    const user = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      dateOfBirth: new Date('1990-01-15'),
      gender: 'Male',
      phone: '555-0123',
    });
    await user.save();
    console.log('Created sample user:', user.email);

    // Create sample test reports
    const reports = [
      {
        userId: user._id,
        testName: 'Blood Test - CBC',
        testDate: new Date('2024-01-15'),
        testType: 'Blood',
        results: {
          hemoglobin: '13.5 g/dL',
          hematocrit: '40%',
          wbc: '7.2 K/uL',
          platelets: '225 K/uL',
          rbc: '4.8 M/uL',
        },
        doctor: {
          name: 'Dr. Smith',
          email: 'smith@clinic.com',
          clinic: 'General Health Clinic',
        },
        notes: 'Normal results. All values within expected range.',
        normal: true,
      },
      {
        userId: user._id,
        testName: 'Blood Test - Glucose',
        testDate: new Date('2024-01-15'),
        testType: 'Blood',
        results: {
          glucose: '95 mg/dL',
          fasting: 'true',
        },
        doctor: {
          name: 'Dr. Johnson',
          email: 'johnson@clinic.com',
          clinic: 'Diabetes Care Center',
        },
        notes: 'Fasting glucose normal.',
        normal: true,
      },
      {
        userId: user._id,
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
          name: 'Dr. Smith',
          email: 'smith@clinic.com',
          clinic: 'General Health Clinic',
        },
        notes: 'Cholesterol levels are good.',
        normal: true,
      },
      {
        userId: user._id,
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
      },
      {
        userId: user._id,
        testName: 'Liver Function Test',
        testDate: new Date('2024-04-05'),
        testType: 'Blood',
        results: {
          ast: '28 U/L',
          alt: '32 U/L',
          alkalinePhosphatase: '72 U/L',
          totalBilirubin: '0.8 mg/dL',
        },
        doctor: {
          name: 'Dr. Smith',
          email: 'smith@clinic.com',
          clinic: 'General Health Clinic',
        },
        notes: 'Liver function is normal.',
        normal: true,
      },
    ];

    for (const reportData of reports) {
      const report = new TestReport(reportData);
      await report.save();
      console.log('Created report:', report.testName);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\nSample User Credentials:');
    console.log('Email: john@example.com');
    console.log('Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

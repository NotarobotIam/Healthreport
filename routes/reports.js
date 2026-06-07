const express = require('express');
const TestReport = require('../models/TestReport');
const protect = require('../middleware/auth');
const demoStore = require('../demoStore');

const router = express.Router();

// Demo mode flag
const DEMO_MODE = process.env.DEMO_MODE === 'true' || true; // Enable demo mode by default

// @route   POST /api/reports
// @desc    Create a new test report
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { testName, testDate, testType, results, doctor, notes, normal } = req.body;

    if (DEMO_MODE) {
      const report = demoStore.createReport({
        userId: req.user.id,
        testName,
        testDate,
        testType,
        results,
        doctor,
        notes,
        normal: normal !== undefined ? normal : true,
      });
      return res.status(201).json({
        success: true,
        report,
      });
    }

    const report = new TestReport({
      userId: req.user.id,
      testName,
      testDate,
      testType,
      results,
      doctor,
      notes,
      normal,
    });

    await report.save();

    res.status(201).json({
      success: true,
      report,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/reports
// @desc    Get all test reports for the logged-in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    if (DEMO_MODE) {
      const reports = demoStore.getReportsByUserId(req.user.id);
      return res.status(200).json({
        success: true,
        count: reports.length,
        reports,
      });
    }

    const reports = await TestReport.find({ userId: req.user.id }).sort({ testDate: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/reports/:id
// @desc    Get a specific test report
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    if (DEMO_MODE) {
      const report = demoStore.getReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      if (report.userId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to access this report' });
      }
      return res.status(200).json({
        success: true,
        report,
      });
    }

    const report = await TestReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if report belongs to user
    if (report.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this report' });
    }

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/reports/:id
// @desc    Update a test report
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    if (DEMO_MODE) {
      let report = demoStore.getReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      if (report.userId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this report' });
      }
      report = demoStore.updateReport(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        report,
      });
    }

    let report = await TestReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if report belongs to user
    if (report.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this report' });
    }

    report = await TestReport.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete a test report
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    if (DEMO_MODE) {
      const report = demoStore.getReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      if (report.userId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this report' });
      }
      demoStore.deleteReport(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Report deleted',
      });
    }

    const report = await TestReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if report belongs to user
    if (report.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this report' });
    }

    await TestReport.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Report deleted',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/reports/transpose
// @desc    Get transposed test data for comparison
// @access  Private
router.post('/transpose/data', protect, async (req, res) => {
  try {
    let reports;
    
    if (DEMO_MODE) {
      reports = demoStore.getReportsByUserId(req.user.id);
    } else {
      reports = await TestReport.find({ userId: req.user.id }).sort({ testDate: 1 });
    }

    if (reports.length === 0) {
      return res.status(200).json({
        success: true,
        transposed: {},
      });
    }

    // Transpose data: columns are test values, rows are test dates
    const transposed = {};
    const testDates = [];

    reports.forEach((report) => {
      testDates.push(report.testDate);
      Object.keys(report.results).forEach((key) => {
        if (!transposed[key]) {
          transposed[key] = {};
        }
        transposed[key][report.testDate] = report.results[key];
      });
    });

    res.status(200).json({
      success: true,
      testDates,
      transposed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

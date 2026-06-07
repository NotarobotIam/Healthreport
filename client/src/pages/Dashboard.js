import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getReports, deleteReport } from '../api';
import './Dashboard.css';

function Dashboard({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    testName: '',
    testDate: '',
    testType: '',
    results: '',
    notes: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await getReports();
      setReports(res.data.reports);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await deleteReport(id);
      setReports(reports.filter((r) => r._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete report');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // This would typically call an API to create a report
    // For now, we're just showing the form structure
    console.log('Submit form:', formData);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Loading reports...</div>;
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Welcome, {user.name}!</h1>
        <p>Here are your health test reports</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="dashboard-actions">
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add New Report'}
        </button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>Add New Test Report</h3>
          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label htmlFor="testName">Test Name</label>
              <input
                type="text"
                id="testName"
                name="testName"
                value={formData.testName}
                onChange={handleFormChange}
                placeholder="e.g., Blood Test"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="testDate">Test Date</label>
              <input
                type="date"
                id="testDate"
                name="testDate"
                value={formData.testDate}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="testType">Test Type</label>
              <select
                id="testType"
                name="testType"
                value={formData.testType}
                onChange={handleFormChange}
                required
              >
                <option value="">Select Type</option>
                <option value="Blood">Blood</option>
                <option value="Urine">Urine</option>
                <option value="Imaging">Imaging</option>
                <option value="Genetic">Genetic</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="results">Results (JSON format)</label>
              <textarea
                id="results"
                name="results"
                value={formData.results}
                onChange={handleFormChange}
                placeholder='{"hemoglobin": "13.5", "glucose": "95"}'
                rows="4"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                placeholder="Additional notes about the test"
                rows="3"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Save Report
            </button>
          </form>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="card">
          <p className="empty-state">No reports yet. Add your first health test report!</p>
        </div>
      ) : (
        <div className="reports-grid">
          {reports.map((report) => (
            <div key={report._id} className="report-card">
              <div className="report-header">
                <h3>{report.testName}</h3>
                <span className={`badge ${report.normal ? 'badge-success' : 'badge-danger'}`}>
                  {report.normal ? 'Normal' : 'Abnormal'}
                </span>
              </div>
              <div className="report-info">
                <p>
                  <strong>Type:</strong> {report.testType}
                </p>
                <p>
                  <strong>Date:</strong> {new Date(report.testDate).toLocaleDateString()}
                </p>
                {report.doctor && (
                  <p>
                    <strong>Doctor:</strong> {report.doctor.name}
                  </p>
                )}
              </div>
              <div className="report-actions">
                <Link to={`/report/${report._id}`} className="btn btn-primary">
                  View Details
                </Link>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(report._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReport, updateReport } from '../api';
import './ReportDetail.css';

function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const res = await getReport(id);
      setReport(res.data.report);
      setFormData(res.data.report);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'normal') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === 'true',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateReport(id, formData);
      setReport(res.data.report);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update report');
    }
  };

  if (loading) {
    return <div className="loading">Loading report...</div>;
  }

  if (error) {
    return <div className="container"><div className="alert alert-danger">{error}</div></div>;
  }

  if (!report) {
    return <div className="container"><div className="alert alert-danger">Report not found</div></div>;
  }

  return (
    <div className="container">
      <div className="report-detail">
        <div className="detail-header">
          <div>
            <h1>{report.testName}</h1>
            <p className="report-date">{new Date(report.testDate).toLocaleDateString()}</p>
          </div>
          <span className={`badge ${report.normal ? 'badge-success' : 'badge-danger'}`}>
            {report.normal ? 'Normal' : 'Abnormal'}
          </span>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {!editing ? (
          <div className="report-content">
            <div className="info-section">
              <h3>Test Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Test Type:</label>
                  <value>{report.testType}</value>
                </div>
                <div className="info-item">
                  <label>Test Date:</label>
                  <value>{new Date(report.testDate).toLocaleDateString()}</value>
                </div>
                {report.doctor && (
                  <>
                    <div className="info-item">
                      <label>Doctor:</label>
                      <value>{report.doctor.name}</value>
                    </div>
                    <div className="info-item">
                      <label>Clinic:</label>
                      <value>{report.doctor.clinic}</value>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="results-section">
              <h3>Test Results</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.results || {}).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {report.notes && (
              <div className="notes-section">
                <h3>Notes</h3>
                <p>{report.notes}</p>
              </div>
            )}

            <div className="detail-actions">
              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                Edit Report
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="edit-form">
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes || ''}
                onChange={handleFormChange}
                rows="4"
              />
            </div>
            <div className="form-group">
              <label htmlFor="normal">Status</label>
              <select id="normal" name="normal" value={formData.normal ? 'true' : 'false'} onChange={handleFormChange}>
                <option value="true">Normal</option>
                <option value="false">Abnormal</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditing(false);
                  setFormData(report);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ReportDetail;

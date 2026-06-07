import React, { useState, useEffect } from 'react';
import { getTransposedData, getReports } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './TransposeView.css';

function TransposeView() {
  const [transposed, setTransposed] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transRes, reportsRes] = await Promise.all([getTransposedData(), getReports()]);
      setTransposed(transRes.data.transposed);
      setReports(reportsRes.data.reports);

      // Select first 5 metrics by default
      const metrics = Object.keys(transRes.data.transposed || {}).slice(0, 5);
      setSelectedMetrics(metrics);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleMetricToggle = (metric) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  const prepareChartData = () => {
    if (!transposed || selectedMetrics.length === 0) return [];

    // Get all dates from the first metric
    const firstMetric = selectedMetrics[0];
    const dates = Object.keys(transposed[firstMetric] || {}).sort((a, b) => new Date(a) - new Date(b));

    return dates.map((date) => {
      const dataPoint = { date: new Date(date).getTime() };
      selectedMetrics.forEach((metric) => {
        let value = transposed[metric][date];
        // Extract numeric value from strings like "13.5 g/dL"
        if (typeof value === 'string') {
          const numMatch = value.match(/^[\d.]+/);
          value = numMatch ? parseFloat(numMatch[0]) : null;
        }
        dataPoint[metric] = value;
      });
      return dataPoint;
    });
  };

  const getMetricsForComparison = () => {
    if (!transposed) return {};

    const comparison = {};
    selectedMetrics.forEach((metric) => {
      const values = Object.values(transposed[metric] || {}).filter(
        (v) => v !== null && v !== undefined && v !== ''
      );
      if (values.length > 0) {
        // Try to convert to numbers for calculation
        const numValues = values.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
        if (numValues.length > 0) {
          comparison[metric] = {
            min: Math.min(...numValues),
            max: Math.max(...numValues),
            avg: (numValues.reduce((a, b) => a + b, 0) / numValues.length).toFixed(2),
            latest: numValues[numValues.length - 1],
          };
        } else {
          comparison[metric] = {
            values: values,
            latest: values[values.length - 1],
          };
        }
      }
    });

    return comparison;
  };

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  if (error) {
    return <div className="container"><div className="alert alert-danger">{error}</div></div>;
  }

  if (!transposed || Object.keys(transposed).length === 0) {
    return (
      <div className="container">
        <div className="card">
          <p className="empty-state">No test data available for comparison yet.</p>
        </div>
      </div>
    );
  }

  const allMetrics = Object.keys(transposed);
  const chartData = prepareChartData();
  const metricsComparison = getMetricsForComparison();

  return (
    <div className="container">
      <div className="transpose-header">
        <h1>Data Analysis & Comparison</h1>
        <p>View and compare your health metrics over time</p>
      </div>

      <div className="card metrics-selector">
        <h3>Select Metrics to Compare</h3>
        <div className="metrics-list">
          {allMetrics.map((metric) => (
            <label key={metric} className="metric-checkbox">
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric)}
                onChange={() => handleMetricToggle(metric)}
              />
              <span>{metric}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="view-mode-selector">
        <button
          className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('table')}
        >
          Table View
        </button>
        <button
          className={`btn ${viewMode === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('chart')}
        >
          Chart View
        </button>
      </div>

      {viewMode === 'chart' && chartData.length > 0 && (
        <div className="card">
          <h3>Metrics Trend</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip labelFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()} />
              <Legend />
              {selectedMetrics.map((metric, index) => {
                const colors = [
                  '#8884d8',
                  '#82ca9d',
                  '#ffc658',
                  '#ff7c7c',
                  '#8dd1e1',
                  '#d084d0',
                ];
                return (
                  <Line
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    stroke={colors[index % colors.length]}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {viewMode === 'table' && (
        <>
          <div className="card">
            <h3>Metrics Summary</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Latest Value</th>
                  <th>Average</th>
                  <th>Min</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                {selectedMetrics.map((metric) => {
                  const data = metricsComparison[metric];
                  return (
                    <tr key={metric}>
                      <td>{metric}</td>
                      <td>{data?.latest || 'N/A'}</td>
                      <td>{data?.avg || 'N/A'}</td>
                      <td>{data?.min || 'N/A'}</td>
                      <td>{data?.max || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Complete Transposed Data</h3>
            <div className="table-wrapper">
              <table className="table table-transposed">
                <thead>
                  <tr>
                    <th>Metric</th>
                    {Object.keys(transposed[selectedMetrics[0]] || {})
                      .sort()
                      .map((date) => (
                        <th key={date}>{new Date(date).toLocaleDateString()}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedMetrics.map((metric) => (
                    <tr key={metric}>
                      <td className="metric-name">{metric}</td>
                      {Object.keys(transposed[metric] || {})
                        .sort()
                        .map((date) => (
                          <td key={date}>{transposed[metric][date]}</td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TransposeView;
